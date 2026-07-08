import os
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import SessionLocal, ChatLog
from kafka_consumer import start_kafka_consumer

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executa quando a API iniciar
    print("Iniciando Kafka Consumer...")
    start_kafka_consumer()
    yield
    # Executa quando a API desligar
    print("Encerrando API...")

app = FastAPI(title="Log Service", lifespan=lifespan)

# Dependência para pegar a sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Log Service is running"}

@app.get("/logs")
def get_all_logs(db: Session = Depends(get_db)):
    logs = db.query(ChatLog).order_by(ChatLog.id.desc()).all()
    return logs

@app.get("/logs/{user_id}")
def get_logs_by_user(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(ChatLog).filter(
        (ChatLog.remetenteId == user_id) | (ChatLog.destinatarioId == user_id)
    ).order_by(ChatLog.id.desc()).all()
    return logs

if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", 8083))
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
