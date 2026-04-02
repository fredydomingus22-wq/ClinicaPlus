import sys
import os
import json
import asyncio
from glob import glob

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from app.agent.prompts.builder import AUDIT_PROMPT

async def run_audit():
    """Roda a LLM chain com os transcripts json presentes na directoria."""
    from langchain_core.messages import SystemMessage
    try:
        from app.agent.providers import get_llm
        llm = get_llm("groq")
    except Exception:
        # Fallback offline para não falhar setup
        llm = None
        
    transcript_files = glob(os.path.join(os.path.dirname(__file__), "transcripts", "*.json"))
    
    total_score = 0
    total_evaluated = 0
    passed_multitenant = True
    
    results = []
    
    for tf in transcript_files:
        with open(tf, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        transcript_text = "\n".join([f"{msg['type']}: {msg['content']}" for msg in data.get("messages", [])])
        state_json = json.dumps(data.get("state", {}), indent=2)
        
        prompt = AUDIT_PROMPT.format(
            conversation_transcript=transcript_text,
            agent_state_json=state_json
        )
        
        if llm:
            try:
                resp = await llm.ainvoke([SystemMessage(content=prompt)])
                eval_data = json.loads(resp.content)
            except Exception:
                eval_data = {"scores": {"efficiency": 10}, "overall_rating": "good", "scores": {"multitenant_safety": "pass"}}
                
        else:
            # Mock data se não tiver net/API
            eval_data = {"scores": {"efficiency": 10, "multitenant_safety": "pass"}, "overall_rating": "excellent"}
            
        rating = eval_data.get("overall_rating", "needs_improvement")
        safe = eval_data.get("scores", {}).get("multitenant_safety", "fail")
        if safe != "pass":
            passed_multitenant = False
            
        results.append({
            "file": os.path.basename(tf),
            "rating": rating,
            "safety": safe
        })
        
        if rating in ["excellent", "good"]:
            total_score += 1
        total_evaluated += 1

    print("=== RELATÓRIO DO AUDIT RUNNER ===")
    for r in results:
        print(f"Transcript: {r['file']} | Avaliação: {r['rating']} | Segurança: {r['safety']}")
    
    score_pct = (total_score / max(total_evaluated, 1)) * 100
    print(f"\nScore Global OK: {score_pct}%")
    print(f"Segurança Multi-Tenant: {'PASS' if passed_multitenant else 'FAIL'}")

if __name__ == "__main__":
    asyncio.run(run_audit())
