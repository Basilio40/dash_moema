/**
 * Ajuste de despesas: subtrai dos totais apresentados nos dashboards os itens
 * que não devem compor o resultado operacional exibido.
 *
 * Itens excluídos do total de despesas (itemCod conforme dre-details.json):
 *  - 4.07.01        → grupo 4.07 "DESPESAS FINANCEIRAS VARIÁVEIS"
 *  - 4.03.02        → "COMISSÕES E BÔNUS DE TERCEIROS"
 *  - 4.03.01.02.03  → "Comissões captação"
 *  - 4.03.01.01     → removido do dre-details.json; valores fixos abaixo
 *
 * Observação: estes itens continuam visíveis na tabela detalhada do DRE —
 * apenas deixam de somar para o total/margem/resultado dos KPIs e gráficos.
 * Implementação pura (UI): não altera os JSON nem o pipeline de dados.
 */
import details from "@/data/dre-details.json";

/** itemCod exatos que devem ser subtraídos das despesas exibidas. */
export const CODIGOS_EXCLUIDOS = ["4.07.01", "4.03.02", "4.03.01.02.03"] as const;

/**
 * Itens excluídos em definitivo (não existem mais no dre-details.json).
 * Valores por mês conforme o último registro conhecido do item.
 * 4.03.01.01 → Jul: 80.000,00 | total: 80.000,00
 */
const ITENS_REMOVIDOS: Record<string, Record<string, number>> = {
  "4.03.01.01": { Jul: 80000, total: 80000 },
};

type ItemDre = {
  grupoCod: string;
  itemCod: string;
  total: number;
} & Record<string, number | string>;

const itensExcluidos = (details as ItemDre[]).filter((d) =>
  (CODIGOS_EXCLUIDOS as readonly string[]).includes(d.itemCod),
);

/** Soma o valor dos itens excluídos em um mês específico ("Jan".."Jul"). */
export function valorExcluidoMes(mes: string): number {
  const fixo = Object.values(ITENS_REMOVIDOS).reduce(
    (s, m) => s + (m[mes] ?? 0),
    0,
  );
  return (
    fixo +
    itensExcluidos.reduce((s, it) => {
      const v = it[mes];
      return s + (typeof v === "number" ? v : 0);
    }, 0)
  );
}

/** Soma o valor dos itens excluídos considerando todos os meses. */
export function valorExcluidoTotal(): number {
  const fixo = Object.values(ITENS_REMOVIDOS).reduce((s, m) => s + (m.total ?? 0), 0);
  return fixo + itensExcluidos.reduce((s, it) => s + (typeof it.total === "number" ? it.total : 0), 0);
}

type MesDre = {
  mes: string;
  receitas: number;
  despesas: number;
  resultado: number;
  margem: number;
};

/**
 * Recebe o array dreMonth (após filterByMes) e devolve uma cópia com:
 *  - despesas = original − itens excluídos do mês
 *  - resultado = receitas − despesas (recalculado)
 *  - margem = receitas ? (resultado / receitas) * 100 : 0 (recalculado)
 * Não muta o array/original nem os registros.
 */
export function ajustarDespesas(meses: MesDre[]): MesDre[] {
  return meses.map((m) => {
    const despesas = m.despesas - valorExcluidoMes(m.mes);
    const resultado = m.receitas - despesas;
    const margem = m.receitas ? (resultado / m.receitas) * 100 : 0;
    return { ...m, despesas, resultado, margem };
  });
}
