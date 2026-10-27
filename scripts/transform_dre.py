"""
Generate the Moema dashboard JSON (ITALINEA - DECORA INTERIORES LTDA).

Usa a cópia vendorizada do transform_dre do repo de dados (arquivos_ita) —
a MESMA lógica que a GitHub Action usa para regenerar app/*.json em produção
— lendo os DREs de loja_18314_MOEMA_FIN/relatorios_focco. A receita do
dreMonth já vem composta do próprio DRE:

    3.01 RECEITA BRUTA − 4.03.01.02.03 − 4.03.02 − 4.07

A carteira mensal (loja_18314_MOEMA/relatorios_carteira_mensal) alimenta
apenas o bloco "carteira". Em seguida delega aos scripts locais
gerar_projecao_contratos/gerar_comissoes (leem as pastas loja_18314_*
ao vivo, diferente das cópias de arquivos_ita, que leem xlsx/).
"""
import importlib.util
import json
import os
import re
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS_DIR)

# Carregado pelo caminho para não poluir o sys.path com arquivos_ita/scripts
# (os gerar_* locais precisam continuar resolvendo para ESTA pasta).
TRANSFORM_PATH = os.path.join(BASE_DIR, 'arquivos_ita', 'scripts', 'transform_dre.py')
_spec = importlib.util.spec_from_file_location('transform_dre_arquivos_ita', TRANSFORM_PATH)
transform_dre = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(transform_dre)

# Itens removidos em definitivo das tabelas (não aparecem no dre-details.json).
# Os valores continuam sendo subtraídos dos totais pela UI (src/lib/despesas.ts).
ITENS_REMOVIDOS_DETALHE = {'4.03.01.01'}

MESES_EXTENSO = {
    'Jan': 'Janeiro', 'Fev': 'Fevereiro', 'Mar': 'Março', 'Abr': 'Abril',
    'Mai': 'Maio', 'Jun': 'Junho', 'Jul': 'Julho', 'Ago': 'Agosto',
    'Set': 'Setembro', 'Out': 'Outubro', 'Nov': 'Novembro', 'Dez': 'Dezembro',
}


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


def detectar_ano(source_dir):
    """Ano do DRE mais recente em source_dir (fallback: ano corrente)."""
    anos = []
    if os.path.isdir(source_dir):
        for nome in os.listdir(source_dir):
            m = re.match(r'DRE_\d{2}_(\d{4})\.xlsx$', nome)
            if m:
                anos.append(int(m.group(1)))
    return max(anos) if anos else datetime.now().year


if __name__ == '__main__':
    source_dir = os.path.join(BASE_DIR, 'loja_18314_MOEMA_FIN', 'relatorios_focco')
    project_dir = os.path.join(BASE_DIR, 'pro-dash-guide-main')

    ano = detectar_ano(source_dir)
    transform_dre.ANO = ano
    meses = transform_dre.detect_months(source_dir)
    if not meses:
        raise SystemExit(f'nenhum DRE_{{mm}}_{ano}.xlsx encontrado em {source_dir}')
    periodo = f'Janeiro a {MESES_EXTENSO[meses[-1]]} / {ano}'

    transform_dre.main([
        '--source-dir', source_dir,
        '--carteira-dir', os.path.join(BASE_DIR, 'loja_18314_MOEMA', 'relatorios_carteira_mensal'),
        '--project-dir', project_dir,
        '--ano', str(ano),
        '--empresa', 'ITALINEA - DECORA INTERIORES LTDA',
        '--periodo', periodo,
    ])
    remover_itens_detalhe(project_dir)

    # Projeção de contratos (eixo X da previsão de despesas com vendas) a
    # partir do relatório de contratos da MOEMA.
    import gerar_projecao_contratos  # noqa: E402
    gerar_projecao_contratos.main()

    # Comissões por função (aba Comissões, complementar ao Fluxo de Caixa):
    # Montador/Liberador/Vendedor/Gerente/Medidor a partir da assinatura.
    import gerar_comissoes  # noqa: E402
    gerar_comissoes.main()

    # Fluxo de caixa (previsto × efetivado) a partir dos relatórios da loja.
    import gerar_previsao_fluxo  # noqa: E402
    gerar_previsao_fluxo.main()
    import gerar_realizado_fluxo  # noqa: E402
    gerar_realizado_fluxo.main()
