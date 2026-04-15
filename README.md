# GrupoSpy 🚀

Monitor inteligente de grupos WhatsApp com IA — powered by uazapiGO v2.0.1

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Node.js 20 + Fastify 4 |
| Worker | BullMQ + node-cron |
| Banco | PostgreSQL 16 |
| Cache/Filas | Redis 7 |
| IA | Claude Haiku (Anthropic) |
| WhatsApp | uazapiGO v2.0.1 |
| Proxy | Nginx |

## Início rápido

```bash
# 1. Clonar e entrar
git clone <repo> grupospy && cd grupospy

# 2. Setup automático (gera secrets, builda, inicia)
chmod +x setup.sh && ./setup.sh

# 3. Abrir no browser
open http://localhost:3000
```

## Configuração manual (.env)

```bash
cp .env .env.local   # editar com suas chaves reais
```

Chaves obrigatórias para funcionar:

| Variável | Onde obter |
|---|---|
| `UAZAPI_ADMIN_TOKEN` | Painel uazapi.com |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com (opcional) |

## Comandos Docker

```bash
# Iniciar tudo
docker compose up -d

# Ver logs
docker compose logs -f backend
docker compose logs -f worker

# Parar
docker compose down

# Rebuild após mudanças
docker compose up -d --build backend

# Acessar banco
docker compose exec postgres psql -U grupospy -d grupospy
```

## Estrutura do projeto

```
grupospy/
├── backend/
│   ├── db/
│   │   └── init.sql          # Schema completo PostgreSQL
│   ├── src/
│   │   ├── server.js         # API Fastify (porta 3001)
│   │   ├── worker.js         # Workers Bull + 8 cron jobs
│   │   ├── db/
│   │   │   ├── connection.js # Pool PostgreSQL
│   │   │   └── redis.js      # Redis + filas Bull
│   │   ├── services/
│   │   │   ├── uazapi.js     # Todos os endpoints uazapi
│   │   │   ├── ai.js         # Resumos, sentimento, heat score
│   │   │   └── webhookProcessor.js  # Handler de eventos WA
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT + tenant isolation
│   │   └── routes/
│   │       ├── auth.js       # Login, registro, refresh
│   │       ├── numbers.js    # Instâncias uazapi
│   │       ├── groups.js     # Grupos + mensagens + IA
│   │       ├── analytics.js  # Dashboard + heat map + tasks
│   │       ├── contacts.js   # CRUD + CSV import + WA validation
│   │       ├── admin.js      # Painel admin + métricas SaaS
│   │       └── webhookAndBroadcasts.js  # Webhook + campanhas
│   ├── Dockerfile
│   └── Dockerfile.worker
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── auth/login/    # Tela de login
│       │   ├── auth/register/ # Tela de cadastro
│       │   ├── dashboard/     # Dashboard principal
│       │   ├── groups/        # Chat + resumo IA
│       │   ├── broadcasts/    # Campanhas de disparo
│       │   ├── connections/   # QR Code + gerenciar números
│       │   └── contacts/      # Lista + importação CSV
│       ├── components/
│       │   └── layout/        # Sidebar + AppLayout
│       ├── hooks/
│       │   └── useRealtime.js # WebSocket auto-reconexão
│       └── lib/
│           └── api.js         # Client centralizado
│
├── nginx/
│   └── nginx.conf            # Proxy reverso
├── docker-compose.yml
├── .env                      # Variáveis de ambiente
└── setup.sh                  # Script de setup automático
```

## Funcionalidades

### Dashboard
- Métricas: grupos monitorados, sem resposta, mensagens do dia
- Mapa de calor de atividade (últimas 48h)
- Top grupos por atividade
- Alertas abertos em tempo real

### Conversas (Grupos)
- Histórico de mensagens ao vivo (WebSocket)
- Envio de mensagens diretamente pelo painel
- Resumo diário gerado por IA (Claude Haiku)
- Detecção de tarefas e tópicos
- Análise de sentimento

### Disparos
- Criação de campanhas em 3 passos
- Seleção de grupos destino com checkbox
- Agendamento com data/hora
- Delay anti-ban configurável (min/max)
- Relatório de entrega por grupo
- Variáveis dinâmicas: `{{nome_grupo}}`, `{{data}}`

### Conexões
- Conectar múltiplos números via QR Code
- Status em tempo real
- Sincronização de grupos
- Configuração de delay anti-ban

### Contatos
- CRUD completo
- Importação via CSV
- Validação se número tem WhatsApp
- Tags e campos customizados

### Admin (você)
- Métricas SaaS: MRR, churn, novos clientes
- Gestão de tenants e planos
- Impersonation de clientes
- Controle de custos de IA por tenant

## Cron Jobs

| Horário | Job |
|---|---|
| 07:00 diário | Resumos diários com Claude Haiku |
| 00:00 diário | Heat scores finais |
| 00:30 diário | Sync de grupos de todos os números |
| 09:00 segunda | Resumos semanais |
| 02:00 diário | Limpeza de dados antigos |
| */5 min | Alertas de grupos sem resposta |
| */10 min | Verificação de status das instâncias |
| */1 min | Execução de broadcasts agendados |
| */30 min | Sync de status de campanhas |

## Modelo de preços

| Plano | Preço | Números | Grupos |
|---|---|---|---|
| Starter | R$ 97/mês | 1 | 10 |
| Growth | R$ 247/mês | 3 | 90 |
| Business | R$ 697/mês | 10 | Ilimitado |

## Suporte

Para dúvidas sobre integração uazapi: https://docs.uazapi.com
