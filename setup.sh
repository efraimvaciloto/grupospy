#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       GrupoSpy — Setup Inicial       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Verificar dependências
echo -e "${YELLOW}Verificando dependências...${NC}"
command -v docker     >/dev/null 2>&1 || { echo -e "${RED}Docker não encontrado.${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo -e "${RED}Docker Compose não encontrado.${NC}"; exit 1; }
echo -e "${GREEN}✓ Docker ok${NC}"

# 2. Copiar .env se não existir
if [ ! -f .env ]; then
  echo -e "${YELLOW}Criando .env a partir do exemplo...${NC}"
  cp .env.example .env 2>/dev/null || true
  echo -e "${YELLOW}⚠  Edite o arquivo .env antes de continuar!${NC}"
fi

# 3. Gerar secrets aleatórios no .env (se ainda forem os defaults)
if grep -q "grupospy_secret_change_me" .env; then
  echo -e "${YELLOW}Gerando secrets aleatórios...${NC}"
  PG_PASS=$(openssl rand -hex 16)
  RD_PASS=$(openssl rand -hex 16)
  JWT_SEC=$(openssl rand -hex 32)
  REF_SEC=$(openssl rand -hex 32)
  WH_SEC=$(openssl rand -hex 16)

  sed -i "s/grupospy_secret_change_me/$PG_PASS/g" .env
  sed -i "s/redis_secret_change_me/$RD_PASS/g"    .env
  sed -i "s/jwt_super_secret_change_me_32chars_min/$JWT_SEC/g" .env
  sed -i "s/refresh_super_secret_change_me/$REF_SEC/g"         .env
  sed -i "s/webhook_secret_change_me/$WH_SEC/g"               .env
  echo -e "${GREEN}✓ Secrets gerados${NC}"
fi

# 4. Build e start
echo ""
echo -e "${YELLOW}Iniciando containers...${NC}"
docker compose pull --quiet
docker compose build --quiet
docker compose up -d

# 5. Aguardar banco
echo -e "${YELLOW}Aguardando banco de dados...${NC}"
until docker compose exec -T postgres pg_isready -U grupospy -q; do
  sleep 2
done
echo -e "${GREEN}✓ PostgreSQL pronto${NC}"

# 6. Aguardar API
echo -e "${YELLOW}Aguardando API...${NC}"
for i in $(seq 1 30); do
  curl -sf http://localhost:3001/health >/dev/null 2>&1 && break
  sleep 2
done
echo -e "${GREEN}✓ API pronta${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗"
echo -e "║        GrupoSpy rodando! 🚀          ║"
echo -e "╠══════════════════════════════════════╣"
echo -e "║  Frontend:  http://localhost:3000    ║"
echo -e "║  API:       http://localhost:3001    ║"
echo -e "║  Nginx:     http://localhost         ║"
echo -e "╠══════════════════════════════════════╣"
echo -e "║  Login admin padrão:                 ║"
echo -e "║  admin@grupospy.com.br / admin123    ║"
echo -e "║  ⚠  Troque a senha em produção!      ║"
echo -e "╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "  1. Edite .env com suas chaves (uazapi, Anthropic, Stripe)"
echo "  2. Acesse http://localhost:3000 e crie sua conta"
echo "  3. Conecte um número WhatsApp em 'Conexões'"
echo "  4. Sincronize os grupos e comece a monitorar"
echo ""
