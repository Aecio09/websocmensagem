import os
import json
import threading
from confluent_kafka import Consumer, KafkaError
from database import SessionLocal, ChatLog

# Usamos a variável que já estava no docker-compose ou o fallback
KAFKA_BROKER = os.getenv("SPRING_KAFKA_BOOTSTRAP_SERVERS", os.getenv("KAFKA_BROKER", "kafka:9092"))
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "log-service-group")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "chat.messages")

def process_message(msg_value):
    try:
        data = json.loads(msg_value)
        
        db = SessionLocal()
        # O DTO do Java tem: remetenteId, destinatarioId, conteudo, timestamp
        new_log = ChatLog(
            remetenteId=data.get("remetenteId"),
            destinatarioId=data.get("destinatarioId"),
            conteudo=data.get("conteudo"),
            timestamp=data.get("timestamp")
        )
        db.add(new_log)
        db.commit()
        db.close()
        print(f"Log salvo no SQLite: {data}")
    except Exception as e:
        print(f"Erro ao processar mensagem: {e}")

def consume_loop():
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': KAFKA_GROUP_ID,
        'auto.offset.reset': 'earliest'
    }

    consumer = Consumer(conf)
    consumer.subscribe([KAFKA_TOPIC])

    print(f"Conectado ao Kafka em {KAFKA_BROKER}, ouvindo o tópico {KAFKA_TOPIC}...")

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    print(msg.error())
                    break

            # Mensagem recebida!
            process_message(msg.value().decode('utf-8'))
    except Exception as e:
        print(f"Exceção no Consumer: {e}")
    finally:
        consumer.close()

def start_kafka_consumer():
    # Roda o consumer numa thread separada para não travar a API do FastAPI
    thread = threading.Thread(target=consume_loop, daemon=True)
    thread.start()
