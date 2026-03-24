import os
import joblib
import asyncpg
import pandas as pd
from datetime import datetime
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from db.pool import get_pool

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgb_model.pkl")

class NoShowTrainer:
    """Módulo de Treino do Preditor XGBoost (Fase 2)"""

    async def treinar(self):
        """Busca dados históricos e treina o modelo."""
        pool = get_pool()
        if not pool:
            return {"status": "error", "message": "DB Pool não inicializado"}

        # Consulta todos os agendamentos finalizados (concluídos ou faltou)
        query = """
            SELECT
                p.id as paciente_id,
                a."data",
                e.nome as especialidade,
                a.estado
            FROM agendamentos a
            JOIN pacientes p ON a."pacienteId" = p.id
            LEFT JOIN prestadores pr ON a."prestadorId" = pr.id
            LEFT JOIN especialidades e ON pr."especialidadeId" = e.id
            WHERE a.estado IN ('CONCLUIDO', 'FALTOU')
        """
        
        async with pool.acquire() as conn:
            registos = await conn.fetch(query)

        if len(registos) < 150:
            return {"status": "skipping", "message": f"Amostras insuficientes ({len(registos)}). Mínimo 150."}

        # Construir Dataframe
        df = pd.DataFrame([dict(r) for r in registos])
        
        # Eng. Features Simples - simulação temporal e histórico
        df['target'] = (df['estado'] == 'FALTOU').astype(int)
        
        # Fake lead_time e taxa historica simplificada
        # Num cenário real, isto precisaria de window functions SQL ou groupby shift
        df['lead_time_dias'] = 5 # default placeholder features for example
        df['taxa_historica'] = df.groupby('paciente_id')['target'].transform(lambda x: x.shift().expanding().mean()).fillna(0)
        
        df['especialidade_cod'] = 0
        df.loc[df['especialidade'].str.lower().str.contains('pediatria', na=False), 'especialidade_cod'] = 1
        df.loc[df['especialidade'].str.lower().str.contains('geral', na=False), 'especialidade_cod'] = 2

        features = ['taxa_historica', 'lead_time_dias', 'especialidade_cod']
        X = df[features]
        y = df['target']

        # Faltas raras -> falhar graceful
        if y.sum() < 10:
             return {"status": "skipping", "message": "Poucos casos reais de falta para um treino estável."}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Treino XGBoost
        modelo = xgb.XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42, use_label_encoder=False, eval_metric='logloss')
        modelo.fit(X_train, y_train)

        # Avaliação
        preds = modelo.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, preds)

        if auc >= 0.68:
            joblib.dump(modelo, MODEL_PATH)
            return {"status": "success", "auc": float(auc), "message": "Modelo salvo e apto para produção."}
        else:
            return {"status": "rejected", "auc": float(auc), "message": "AUC insuficiente. Continua com Heurística."}
