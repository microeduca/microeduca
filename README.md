# Microteste

## API e Frontend (Railway)

- Ambiente alvo: `https://microeduca.up.railway.app`
- O frontend usa por padrão a API do Railway.
  - Em produção: `window.location.origin + /api` (se o frontend estiver servido pelo mesmo domínio) ou `VITE_API_URL` se definido.
  - Em desenvolvimento (localhost): usa `https://microeduca.up.railway.app/api` por padrão.
- Para apontar para outra API, defina `VITE_API_URL` no ambiente de build:

```bash
# Exemplo
VITE_API_URL=https://seu-dominio/api bun run build
```

## Execução local

- Backend (API):
```bash
npm run api
```
- Frontend:
```bash
bun dev
```

## Gerenciador de pacotes

- Projeto padronizado com Bun (`packageManager: bun@1.2.23`).
- Não usar `npm install`; use `bun install`.
