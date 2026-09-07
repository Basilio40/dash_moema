# -*- coding: utf-8 -*-
"""Gera src/data/fluxo-caixa-previsao.json a partir dos relatorios de previsao
da loja 18314 (loja_18314_FLUXO_DE_CAIXA/relatorios_fluxo_caixa/previsao).

Soma as colunas Credito (entradas) e Debito (saidas) de cada
Previsao_<Mes>_<Ano>.xlsx e mantem apenas os meses a partir do mes atual.

Uso: python scripts/gerar_previsao_fluxo.py
"""
import glob
import json
import os
import warnings
from datetime import date

import openpyxl

warnings.filterwarnings("ignore")

PASTA_PREVISAO = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..",
    "loja_18314_FLUXO_DE_CAIXA",
    "relatorios_fluxo_caixa",
    "previsao",
)
SAIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "data",
    "fluxo-caixa-previsao.json",
)

ORDEM = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
         "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def main():
    registros = []
    for caminho in glob.glob(os.path.join(PASTA_PREVISAO, "*.xlsx")):
        partes = os.path.basename(caminho).replace(".xlsx", "").split("_")
        mes, ano = partes[1], partes[2][-2:]
        ws = openpyxl.load_workbook(caminho, data_only=True).worksheets[0]
        credito = debito = 0.0
        for linha in ws.iter_rows(values_only=True):
            try:
                cred, deb = float(linha[5] or 0), float(linha[6] or 0)
            except (TypeError, ValueError):
                continue  # cabecalho / totais / texto
            credito += cred
            debito += deb
        registros.append(
            {"mes": f"{mes}/{ano}", "entradas": round(credito, 2), "saidas": round(debito, 2)}
        )

    hoje = date.today()
    chave_atual = (hoje.year % 100, hoje.month)
    registros = [
        r for r in registros
        if (int(r["mes"].split("/")[1]), ORDEM.index(r["mes"].split("/")[0]) + 1) >= chave_atual
        and (r["entradas"] > 0 or r["saidas"] > 0)
    ]
    registros.sort(key=lambda r: (int(r["mes"].split("/")[1]), ORDEM.index(r["mes"].split("/")[0])))

    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(registros, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"{len(registros)} meses gravados em {SAIDA}")


if __name__ == "__main__":
    main()
