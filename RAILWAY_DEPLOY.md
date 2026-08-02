# Deploy na Railway

Este projeto é um app **TanStack Start (SSR)** buildado pelo **Vite + Nitro**. Ele foi
configurado para rodar como um servidor **Node.js** na Railway (preset `node-server`
do Nitro), em vez do padrão Cloudflare.

## Pré-requisitos

- Conta na [Railway](https://railway.app)
- Repositório conectado: `https://github.com/Basilio40/dash_moema.git`
- Node.js **>= 22.12** localmente (apenas se quiser rodar/compilar fora da Railway)

## O que foi ajustado para a Railway

| Arquivo          | Mudança                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `vite.config.ts` | `nitro: { preset: "node-server" }` — gera um servidor Node standalone    |
| `package.json`   | Script `start: node .output/server/index.mjs` + `engines.node >= 22.12`  |
| `railway.json`   | Comandos de build/start e healthcheck                                    |
| `Dockerfile`     | Build multi-estágio com Node 22 LTS (ambiente previsível e reproduzível) |
| `.dockerignore`  | Evita copiar `node_modules`, `.git`, saídas de build, etc.               |

> O `node-server` do Nitro já escuta em `0.0.0.0` e lê a variável `PORT`
> automaticamente — exatamente o que a Railway exige.

## Como fazer o deploy

### Opção 1 — Railway CLI

```bash
# 1. Instale a CLI
npm i -g @railway/cli

# 2. Faça login
railway login

# 3. Crie/link o projeto
railway link

# 4. Deploy
railway up
```

A Railway detecta o `Dockerfile` e faz o build automaticamente.

### Opção 2 — Pelo dashboard

1. Acesse [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → selecione `Basilio40/dash_moema`
3. A Railway detecta o `Dockerfile` (ou `railway.json`) e inicia o build
4. Aguarde o healthcheck em `/` passar (timeout de 180s)

## Variáveis de ambiente

A Railway injeta `PORT` automaticamente. Nenhuma variável é obrigatória para subir.

Se o app precisar de outras variáveis no futuro, adicione em
**Service → Variables** no dashboard da Railway.

## Comandos úteis (referência)

| Comando           | Descrição                                          |
| ----------------- | -------------------------------------------------- |
| `bun run dev`     | Ambiente de desenvolvimento                        |
| `bun run build`   | Build de produção (gera `.output/`)                |
| `bun run start`   | Inicia o servidor Node de produção (após o build)  |

## Solução de problemas

- **Build falha com erro de versão do Node**: o `Dockerfile` usa Node 22 LTS, que
  satisfaz o requisito do Vite 8 (`>= 20.19` ou `>= 22.12`). Se usar Nixpacks
  (sem Docker), garanta `engines.node >= 22.12` no `package.json` — já configurado.
- **Container reinicia (healthcheck falha)**: verifique os logs em
  **Service → Deploy Logs**. O healthcheck aponta para `/`, que deve retornar 200.
- **Porta não responde**: o Nitro lê `PORT` do ambiente. Confirme que a Railway
  não está sobrescrevendo com um valor inesperado.