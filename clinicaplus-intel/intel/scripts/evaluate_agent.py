import os
import sys
import uuid
import asyncio
import time
from typing import TypedDict, Annotated
import nest_asyncio

# Aplica nest_asyncio (necessário caso chamem async code em loops sync em alguns wrappers)
nest_asyncio.apply()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from langsmith import Client, evaluate
from langchain_core.messages import HumanMessage

# Garantir encoding UTF-8 no Windows para suportar emojis no log
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from intel.agent.graph import builder
from intel.agent.providers import get_llm

from dotenv import load_dotenv
load_dotenv()

from db_layer import db

# Dataset para avaliação
DATASET_NAME = "ClinicaPlus Core Evals"

def get_or_create_dataset(client: Client):
    exists = False
    try:
        for ds in client.list_datasets():
            if ds.name == DATASET_NAME:
                exists = True
                break
    except Exception as e:
        print(f"Erro ao listar datasets: {e}")
        return
            
    if exists:
        print(f"Dataset {DATASET_NAME} já existe.")
        return
        
    print(f"A gerar dataset inicial: {DATASET_NAME}")
    try:
        dataset = client.create_dataset(DATASET_NAME, description="Casos core fundamentais com identificação de intenções")
        
        client.create_examples(
            inputs=[
                {"question": "Oi. Têm vagas pra pediatria amanhã de manhã?", "is_identified": False},
                {"question": "Aceitam plano de saúde ENSA?", "is_identified": True},
                {"question": "Quero tirar um dente que está a doer e cancelar a de cardiologia", "is_identified": True},
            ],
            outputs=[
                {"expected_intent": "agendar", "focus": "pediatria, amanhã, manhã"},
                {"expected_intent": "duvida", "focus": "seguradoras"},
                {"expected_intent": "agendar", "focus": "raciocínio sobre multiplas tarefas (dente vs cancelar)"},
            ],
            dataset_name=DATASET_NAME
        )
    except Exception as e:
        print(f"Erro ao criar dataset/exemplos: {e}")

# ---- 2. Funções Executáveis (Run Function) ----
async def predict_agent(inputs: dict) -> dict:
    """Wrapper para LangSmith evaluate com Base de Dados Real."""
    from langgraph.store.memory import InMemoryStore
    import db_layer
    
    # 1. Tentar obter clinicaId real (Slug: clinica-teste é o padrão de sementes)
    clinica_id = "clinica-teste" 
    
    try:
        # Purga do pool global para evitar loops órfãos no LangSmith/Windows
        db_layer._pool = None 
        
        # Tenta validar se a clínica existe para evitar erros de NLU
        config_clinica = await db.buscar_config_clinica(clinica_id)
        if not config_clinica or not config_clinica.get("name") or not config_clinica.get("especialidades"):
             # Se falhar o ID padrão ou estiver vazia, busca a primeira clínica da DB 
             async with db.conn() as c:
                row = await c.fetchrow("SELECT id FROM clinicas LIMIT 1")
                if row: 
                    clinica_id = row["id"]
                    config_clinica = await db.buscar_config_clinica(clinica_id)
    except Exception as e:
        print(f"⚠️ Aviso ao carregar clinica {clinica_id}: {e}")
        config_clinica = {"name": f"Mock {clinica_id}", "specialties": ["pediatria", "clinica geral"]}

    # Compilar num sub-grafo local stateless para evals com Store simulado
    dummy_store = InMemoryStore()
    test_graph = builder.compile(store=dummy_store)
    
    thread_id = f"test_{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    
    state_input = {
        "tenant_id": clinica_id,
        "whatsapp_number": "244910000000",
        "patient_id": "test_123" if inputs.get("is_identified") else None,
        "messages": [HumanMessage(content=inputs["question"])],
        "llm_provider": "gemini_25_flash",
        "clinic_config": config_clinica
    }
    
    try:
        result = await test_graph.ainvoke(state_input, config=config)
        
        # Extrair mensagem final post-formatter
        messages = result.get("messages", [])
        last_message = messages[-1].content if messages else ""
        
        return {
            "agent_response": str(last_message),
            "end_state_intent": result.get("intent"),
            "reasoning": result.get("reasoning_context")
        }
    except Exception as e:
        print(f"\n❌ ERRO FATAL no Agente (Pergunta: {inputs.get('question')}): {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e

def run_agent_wrapper(inputs: dict) -> dict:
    """Wrapper síncrono para o LangSmith com tratamento de Quota."""
    time.sleep(5)  # Atraso de segurança para o Gemini 2.5 Flash
    return asyncio.run(predict_agent(inputs))

# ---- 3. LLM-as-Judge Evaluators ----

class EvalGrade(TypedDict):
    reasoning: Annotated[str, ..., "A tua linha de pensamento e análise"]
    score: Annotated[int, ..., "A pontuação de 0 a 10"]

def accuracy_evaluator(run, example) -> dict:
    """Analisa se o agente identificou bem o intento estrutural e respondeu assertivamente."""
    run_outputs = run.outputs if hasattr(run, "outputs") else run.get("outputs", {})
    example_outputs = example.outputs if hasattr(example, "outputs") else example.get("outputs", {})
    example_inputs = example.inputs if hasattr(example, "inputs") else example.inputs
    
    async def grade():
        # Usamos o Juiz Gemini 1.5 Flash para poupar quota do motor principal
        llm = get_llm("gemini").with_structured_output(EvalGrade)
        prompt = f"""
Avalia a assertividade de Resposta e Fluxo (Score de 0 a 10).
Pergunta Origem: {example_inputs.get('question')}
Estado Final Intento: {run_outputs.get('end_state_intent')} (Deveria alinhar com: {example_outputs.get('expected_intent')})
Raciocínio Previo do Bot: {run_outputs.get('reasoning')}
Resposta Final: {run_outputs.get('agent_response')}
Verifica se a resposta está focada nisto: {example_outputs.get('focus')}
Avalia em JSON!
"""
        return await llm.ainvoke([HumanMessage(content=prompt)])
        
    try:
        res = asyncio.run(grade())
        score = res.get("score", 0) if isinstance(res, dict) else getattr(res, "score", 0)
        reasoning = res.get("reasoning", "") if isinstance(res, dict) else getattr(res, "reasoning", "")
        return {"key": "accuracy", "score": int(score), "comment": str(reasoning)}
    except Exception as e:
        print(f"ERRO no accuracy_evaluator (Exemplo: {example_inputs.get('question')[:20]}): {e}")
        return {"key": "accuracy", "score": 0, "comment": f"Falha no Juiz: {str(e)}"}

def tone_evaluator(run, example) -> dict:
    """Valida tom angolano e limites de Whatsapp."""
    run_outputs = run.outputs if hasattr(run, "outputs") else run.get("outputs", {})
    
    async def grade():
        # Usamos o Juiz Gemini 1.5 Flash para poupar quota
        llm = get_llm("gemini").with_structured_output(EvalGrade)
        prompt = f"""
Avalia o TOM e FORMA da Resposta do assistente (Score: 0 a 10).
Resposta: "{run_outputs.get('agent_response')}"
Inclui feedback sobre se o tom é clínico mas amigável e se evita alucinações técnicas.
"""
        return await llm.ainvoke([HumanMessage(content=prompt)])
        
    try:
        res = asyncio.run(grade())
        score = res.get("score", 0) if isinstance(res, dict) else getattr(res, "score", 0)
        reasoning = res.get("reasoning", "") if isinstance(res, dict) else getattr(res, "reasoning", "")
        return {"key": "tone_quality", "score": int(score), "comment": str(reasoning)}
    except Exception as e:
        print(f"ERRO no tone_evaluator: {e}")
        return {"key": "tone_quality", "score": 0, "comment": f"Falha no Juiz Tone: {str(e)}"}

# ---- 4. Executador Principal ----
if __name__ == "__main__":
    print("🚀 Iniciar LangSmith Pipeline...")
    
    # Configurar Cliente com timeouts estendidos para conexões instáveis
    client = Client(timeout_ms=(60000, 120000))
    get_or_create_dataset(client)
    
    print("📊 A executar evaluate() contra o grafo inteiro (Gemini 2.5 Flash)...")
    try:
        results = evaluate(
            run_agent_wrapper, 
            data=DATASET_NAME,
            evaluators=[accuracy_evaluator, tone_evaluator],
            experiment_prefix="agent-eval-pipeline",
            max_concurrency=1, 
            metadata={"version": "1.3", "engine": "gemini-2.5-flash"}
        )
        print("\n✅ Concluído com sucesso!")
    except Exception as e:
        print(f"\n❌ Falha catastrófica no Pipeline: {e}")
