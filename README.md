# Microteste

## API e Frontend (Railway)

- Ambiente alvo: `https://microeduca.up.railway.app`
- O frontend usa por padrão a API do Railway.
  - Em produção: `window.location.origin + /api` (quando front e API estão no mesmo serviço/domínio) ou `VITE_API_URL` se definido.
  - Em desenvolvimento: use também o Railway ou defina `VITE_API_URL` se necessário.

## Variáveis de Ambiente (.env)

Crie um arquivo `.env` no Railway (ou localmente `.env.local`) com:

```env
# Ambiente (opcional)
NODE_ENV=production

# URL da API usada pelo frontend (opcional, pode omitir quando front+API no mesmo domínio)
# VITE_API_URL=https://microeduca.up.railway.app/api

# Banco de dados (Railway)
DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Vimeo
VIMEO_CLIENT_ID=seu_client_id
VIMEO_CLIENT_SECRET=seu_client_secret
```

> Nota: Não usamos mais variáveis do Supabase. Remova-as do painel do Railway se existirem.

## Execução

- Build: `bun install --frozen-lockfile && bun run build`
- Start: `npm run start`

## Gerenciador de pacotes

- Projeto padronizado com Bun (`packageManager: bun@1.2.23`).
- Use `bun install` para instalar dependências.
