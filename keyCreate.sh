#!/bin/bash
set -e

OUTPUT_DIR_KEY="auth-service/src/main/resources"
OUTPUT_DIR_PUB="auth-service/src/main/resources"
OUTPUT_DIR_PUB2="message-service/src/main/resources"

openssl genrsa -out app.key 2048
openssl rsa -in app.key -pubout -out app.pub

mkdir -p "$OUTPUT_DIR_KEY" "$OUTPUT_DIR_PUB2"

mv app.key "$OUTPUT_DIR_KEY/app.key"
mv app.pub "$OUTPUT_DIR_PUB/app.pub"
cp "$OUTPUT_DIR_PUB/app.pub" "$OUTPUT_DIR_PUB2/app.pub"

echo "Chaves JWT criadas:"
echo "  $OUTPUT_DIR_KEY/app.key"
echo "  $OUTPUT_DIR_PUB/app.pub"
echo "  $OUTPUT_DIR_PUB2/app.pub"
