# scripts/

Scripts de geração de dados do dashboard (Moema / Italinea).

## Fluxo de dados

```
planilhas .xlsx (fora do projeto)
   │  scripts/transform_dre.py
   ▼
src/data/dashboard.json + src/data/dre-details.json
   │  import estático nos routes (Vite HMR)
   ▼
UI do dashboard
```

As planilhas de origem **não** ficam no repositório (estão no diretório pai):

- `../loja_18314_MOEMA_FIN/relatorios_focco/DRE_01..07_2026.xlsx`
- `../loja_18314_MOEMA/relatorios_carteira_mensal/Jan..Jul_2026.xlsx`

## Scripts

| Script / Comando            | O que faz                                                         |
| --------------------------- | ----------------------------------------------------------------- |
| `scripts/transform_dre.py`  | Lê as planilhas `.xlsx` e grava os JSON. Depende de `openpyxl`.   |
| `npm run update:data`       | Roda o transformador **uma vez** agora e sai.                     |
| `npm run watch:data`        | Roda uma vez no início e depois **observa** as pastas; ao salvar qualquer `.xlsx`, regenera os JSON. |

> ⚠️ **Somente local/dev.** Estes scripts não afetam o deploy no Railway —
> os JSON já commitados é que vão para produção.

## Como usar em desenvolvimento

Em dois terminais:

```bash
# Terminal 1 — servidor de dev (UI recarrega sozinha via HMR)
npm run dev

# Terminal 2 — watcher de planilhas
npm run watch:data
```

Agora, ao editar e salvar uma planilha `.xlsx` em qualquer uma das pastas de
origem, os JSON são regerados e a página atualiza automaticamente.

Para regenerar manualmente (sem ficar observando):

```bash
npm run update:data
```

## Pré-requisitos

- Python 3 no PATH (testa `python`, depois `py`).
- Dependência Python: `openpyxl` (`pip install openpyxl`).
- Node 22+ (para `fs.watch` recursivo no Windows).
