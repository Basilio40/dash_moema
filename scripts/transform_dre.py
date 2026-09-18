"""
Generate the Moema dashboard JSON (ITALINEA - DECORA INTERIORES LTDA).

Reuses pro-dash-mp/scripts/transform_dre.py, reading the DRE reports from
loja_18314_MOEMA_FIN and overriding the revenue with the monthly carteira
reports from loja_18314_MOEMA/relatorios_carteira_mensal.
"""
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BASE_DIR, 'pro-dash-mp', 'scripts'))

import transform_dre  # noqa: E402

# Itens removidos em definitivo das tabelas (não aparecem no dre-details.json).
# Os valores continuam sendo subtraídos dos totais pela UI (src/lib/despesas.ts).
ITENS_REMOVIDOS_DETALHE = {'4.03.01.01'}


def remover_itens_detalhe(project_dir):
    path = os.path.join(project_dir, 'src', 'data', 'dre-details.json')
    with open(path, encoding='utf-8') as f:
        items = json.load(f)
    filtrados = [it for it in items if it.get('itemCod') not in ITENS_REMOVIDOS_DETALHE]
    removidos = len(items) - len(filtrados)
    if removidos:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(filtrados, f, ensure_ascii=False, indent=2)
            f.write('\n')
    print(f'  dre-details: removed {removidos} item(s) {sorted(ITENS_REMOVIDOS_DETALHE)}')


if __name__ == '__main__':
    transform_dre.main([
        '--source-dir', os.path.join(BASE_DIR, 'loja_18314_MOEMA_FIN', 'relatorios_focco'),
        '--carteira-dir', os.path.join(BASE_DIR, 'loja_18314_MOEMA', 'relatorios_carteira_mensal'),
        '--project-dir', os.path.join(BASE_DIR, 'pro-dash-guide-main'),
        '--empresa', 'ITALINEA - DECORA INTERIORES LTDA',
        '--periodo', 'Janeiro a Agosto / 2026',
    ])
    remover_itens_detalhe(os.path.join(BASE_DIR, 'pro-dash-guide-main'))

    # Projeção de contratos (eixo X da previsão de despesas com vendas) a
    # partir do relatório de contratos da MOEMA.
    import gerar_projecao_contratos  # noqa: E402
    gerar_projecao_contratos.main()
