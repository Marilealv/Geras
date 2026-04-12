# Deploy no Render

## Arquitetura recomendada

- 1 Web Service para API Node (`backend/server/index.js`)
- 1 Static Site para frontend Vite (`frontend/dist`)

## 1) Web Service (API)

- Environment: `Node`
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables:
  - `DATABASE_URL=postgresql://...`
  - `PORT=3001` (opcional)

Depois do deploy, copie a URL da API (exemplo: `https://geras-api.onrender.com`).

## 2) Static Site (Frontend)

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment Variables:
  - `VITE_API_URL=https://geras-api.onrender.com`

## 3) Como o frontend resolve a API

O frontend usa `VITE_API_URL` quando definida.

- Em producao: usa `VITE_API_URL + /api/...`
- Em desenvolvimento local: usa caminho relativo `/api/...` (proxy do Vite)

## 4) Checklist rapido

- API respondeu `GET /api/health`
- Frontend configurado com `VITE_API_URL`
- Login e registro funcionando em producao
