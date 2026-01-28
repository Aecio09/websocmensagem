#!/bin/bash

# ============================================
# Script para rodar o projeto websocmensagem
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$PROJECT_DIR/src/main/resources"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   WebSocket Mensagem - Inicialização${NC}"
echo -e "${BLUE}============================================${NC}"

# Função para gerar chaves JWT
generate_jwt_keys() {
    echo -e "${YELLOW}🔐 Gerando novas chaves JWT RSA...${NC}"
    
    # Gera chave privada RSA 2048 bits
    openssl genrsa -out "$RESOURCES_DIR/app.key" 2048
    
    # Extrai chave pública
    openssl rsa -in "$RESOURCES_DIR/app.key" -pubout -out "$RESOURCES_DIR/app.pub"
    
    # Ajusta permissões
    chmod 600 "$RESOURCES_DIR/app.key"
    chmod 644 "$RESOURCES_DIR/app.pub"
    
    echo -e "${GREEN}✅ Chaves JWT geradas com sucesso!${NC}"
    echo -e "   📁 Chave privada: $RESOURCES_DIR/app.key"
    echo -e "   📁 Chave pública: $RESOURCES_DIR/app.pub"
}

# Verifica se as chaves existem
check_keys() {
    if [[ ! -f "$RESOURCES_DIR/app.key" ]] || [[ ! -f "$RESOURCES_DIR/app.pub" ]]; then
        echo -e "${YELLOW}⚠️  Chaves JWT não encontradas.${NC}"
        generate_jwt_keys
    else
        echo -e "${GREEN}✅ Chaves JWT encontradas.${NC}"
        
        # Pergunta se deseja regenerar
        read -p "Deseja regenerar as chaves JWT? (s/N): " resposta
        if [[ "$resposta" =~ ^[Ss]$ ]]; then
            generate_jwt_keys
        fi
    fi
}

# Verifica dependências
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependências...${NC}"
    
    # Verifica Java
    if ! command -v java &> /dev/null; then
        echo -e "${RED}❌ Java não encontrado. Instale o JDK 17+${NC}"
        exit 1
    fi
    
    # Verifica OpenSSL
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}❌ OpenSSL não encontrado. Instale o openssl${NC}"
        exit 1
    fi
    
    # Verifica Maven Wrapper
    if [[ ! -f "$PROJECT_DIR/mvnw" ]]; then
        echo -e "${RED}❌ Maven Wrapper não encontrado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Todas as dependências OK${NC}"
}

# Verifica MySQL
check_mysql() {
    echo -e "${BLUE}🔍 Verificando conexão MySQL...${NC}"
    
    if command -v mysql &> /dev/null; then
        if mysql -u root -proot -e "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✅ MySQL conectado${NC}"
            
            # Cria banco se não existir
            mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS fun;" 2>/dev/null || true
            echo -e "${GREEN}✅ Banco 'fun' verificado/criado${NC}"
        else
            echo -e "${YELLOW}⚠️  Não foi possível conectar ao MySQL. Verifique se está rodando.${NC}"
            echo -e "${YELLOW}   Configuração esperada: localhost:3306, user: root, pass: root${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  MySQL client não encontrado. Certifique-se que o banco está configurado.${NC}"
    fi
}

# Compila o projeto
build_project() {
    echo -e "${BLUE}🔨 Compilando o projeto...${NC}"
    cd "$PROJECT_DIR"
    
    ./mvnw clean compile -DskipTests -q
    
    echo -e "${GREEN}✅ Projeto compilado com sucesso!${NC}"
}

# Inicia o servidor
start_server() {
    echo -e "${BLUE}🚀 Iniciando o servidor Spring Boot...${NC}"
    echo -e "${YELLOW}   Porta: 8080${NC}"
    echo -e "${YELLOW}   Pressione Ctrl+C para parar${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    cd "$PROJECT_DIR"
    ./mvnw spring-boot:run
}

# Menu principal
main() {
    cd "$PROJECT_DIR"
    
    case "${1:-}" in
        --keys-only)
            check_dependencies
            generate_jwt_keys
            ;;
        --skip-keys)
            check_dependencies
            check_mysql
            build_project
            start_server
            ;;
        --help|-h)
            echo "Uso: $0 [opção]"
            echo ""
            echo "Opções:"
            echo "  (sem opção)   Verifica chaves, compila e inicia o servidor"
            echo "  --keys-only   Apenas gera novas chaves JWT"
            echo "  --skip-keys   Pula verificação de chaves"
            echo "  --help, -h    Mostra esta ajuda"
            ;;
        *)
            check_dependencies
            check_keys
            check_mysql
            build_project
            start_server
            ;;
    esac
}

main "$@"
