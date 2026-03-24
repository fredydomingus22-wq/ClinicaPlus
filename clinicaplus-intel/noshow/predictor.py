import os
import joblib
import pandas as pd
from typing import Dict, Any
from .heuristica import HeuristicaNoShow, SinaisRisco

# Tenta ler do volume Railway, senão fallback local
MODEL_DIR = os.environ.get("MODEL_DIR", "/data/models")
MODEL_PATH = os.path.join(MODEL_DIR, "noshow_latest.joblib")

class NoShowPredictor:
    """Preditor que carrega XGBoost do volume associado, ou usa Heurística Fase 0."""
    
    def __init__(self):
        self.heuristica = HeuristicaNoShow()
        self.modelo = None
        self._carregar_modelo()

    def _carregar_modelo(self):
        """Carrega modelo se existir."""
        if os.path.exists(MODEL_PATH):
            try:
                self.modelo = joblib.load(MODEL_PATH)
                print(f"Modelo de Risco carregado de {MODEL_PATH}")
            except Exception as e:
                print(f"Erro ao carregar modelo {MODEL_PATH}: {e}")
                self.modelo = None

    def recarregar_modelo(self) -> bool:
        self._carregar_modelo()
        return self.modelo is not None

    def predizer(self, sinais: SinaisRisco) -> Dict[str, Any]:
        """Calcula o risco. Dá preferência ao modelo XGBoost se disponível."""
        if not self.modelo:
            return self.heuristica.calcular_score(sinais)
            
        try:
            # Assumimos que o XGBoost foi treinado sobre as propriedades do dataclass
            df = pd.DataFrame([sinais.__dict__])
            # xgb espera booleanos/inteiros, converter onde aplicável
            for col in df.columns:
                 if df[col].dtype == bool:
                      df[col] = df[col].astype(int)
                      
            probabilidade = float(self.modelo.predict_proba(df)[0][1])
            
            # Interpretar e combinar features
            nivel = "BAIXO"
            tipo_lembrete = "STANDARD"
            enviar_segundo = False
            
            if probabilidade >= 0.65:
                nivel = "ALTO"
                tipo_lembrete = "URGENTE"
                enviar_segundo = True
            elif probabilidade >= 0.35:
                nivel = "MEDIO"
                tipo_lembrete = "ATENCAO"

            return {
                "score": probabilidade,
                "nivel": nivel,
                "tipo_lembrete": tipo_lembrete,
                "enviar_segundo": enviar_segundo,
                "raciocinio": f"XGBoost Model (Score: {probabilidade:.2f})"
            }
        except Exception as e:
            print(f"Erro na previsão ML: {str(e)}. Fallback heurística.")
            return self.heuristica.calcular_score(sinais)

# Singleton global (exigido por specs)
predictor = NoShowPredictor()
