"""
Generate the Moema dashboard JSON (ITALINEA - DECORA INTERIORES LTDA).

Reuses pro-dash-mp/scripts/transform_dre.py, reading the DRE reports from
loja_18314_MOEMA_FIN and overriding the revenue with the monthly carteira
reports from loja_18314_MOEMA/relatorios_carteira_mensal.
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BASE_DIR, 'pro-dash-mp', 'scripts'))

import transform_dre  # noqa: E402

if __name__ == '__main__':
    transform_dre.main([
        '--source-dir', os.path.join(BASE_DIR, 'loja_18314_MOEMA_FIN', 'relatorios_focco'),
        '--carteira-dir', os.path.join(BASE_DIR, 'loja_18314_MOEMA', 'relatorios_carteira_mensal'),
        '--project-dir', os.path.join(BASE_DIR, 'pro-dash-guide-main'),
        '--empresa', 'ITALINEA - DECORA INTERIORES LTDA',
        '--periodo', 'Janeiro a Julho / 2026',
    ])
