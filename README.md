# Microteste

## API e Frontend (Railway)

- Ambiente alvo: `https://microeduca.up.railway.app`
- O frontend usa por padrão a API do Railway.
  - Em produção: `window.location.origin + /api` (quando front e API estão no mesmo serviço/domínio) ou `VITE_API_URL` se definido.
  - Em desenvolvimento: use também o Railway ou defina `VITE_API_URL` se necessário.
- Para apontar para outra API, defina `VITE_API_URL` no ambiente de build:

```bash
VITE_API_URL=https://seu-dominio/api bun run build
```

## Execução local (opcional)

- Backend (API):
```bash
npm run api
```
- Frontend build:
```bash
bun run build
```

## Gerenciador de pacotes

- Projeto padronizado com Bun (`packageManager: bun@1.2.23`).
- Use `bun install` para instalar dependências.
