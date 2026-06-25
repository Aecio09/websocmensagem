import os
from fastapi import FastAPI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Log Service")

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "log-service")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "chat.messages")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./logs.db")
PORT = int(os.getenv("PORT", 8082))

@app.get("/")
def read_root():
    return {
        "message": "Log Service is running",
        "config": {
            "kafka_broker": KAFKA_BROKER,
            "kafka_topic": KAFKA_TOPIC,
            "database_url": DATABASE_URL
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
