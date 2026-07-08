from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./logs.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    remetenteId = Column(Integer, index=True)
    destinatarioId = Column(Integer, index=True)
    conteudo = Column(Text)
    timestamp = Column(String) # Vamos armazenar como string (ISO format) por simplicidade
    criado_em_banco = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
