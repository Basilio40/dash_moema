/**
 * Ajuste de despesas do DRE: os valores exibidos nos cards e gráficos são a
 * somatória EXATA dos grupos da tabela
 *   4.01 DEDUÇÕES DE RECEITA
 *   4.02 CUSTOS
 *   4.03 DESPESAS DE VENDAS
 *   4.04 DESPESAS ADMINISTRATIVAS
 *   4.07 DESPESAS FINANCEIRAS VARIÁVEIS
 * subtraídos os itens excluídos (listados nas legendas da UI):
 *   4.03.01.01    REMUNERAÇÃO VARIÁVEL DE SÓCIOS / PROPRIETÁRIOS (oculto da tabela)
 *   4.03.01.02.03 COMISSÕES CAPTAÇÃO
 *   4.03.02       COMISSÕES E BÔNUS DE TERCEIROS
 *   4.07.01       DESPESAS FINANCEIRAS VARIÁVEIS (grupo 4.07 inteiro)
 *
 * O item 4.03.01.01 não existe mais no dre-details.json (removido pelo
 * pipeline); seus valores fixos conhecidos são subtraídos em ITENS_REMOVIDOS.
 *
 * O cálculo parte das próprias linhas de grupo/item renderizadas na tabela,
 * então o número do card reconcilia exatamente com o que aparece na tela.
 * Implementação pura (UI): não altera os JSON nem o pipeline de dados.
 */
import detailsFallback from "@/data/dre-details.json";
import dashboardFallback from "@/data/dashboard.json";

/** Grupos que compõem o total de despesas exibido (somatória da fórmula). */
export const GRUPOS_DESPESA = ["4.01", "4.02", "4.03", "4.04", "4.07"] as const;

/** itemCod exatos subtraídos das despesas exibidas (o 4.07 vira o item 4.07.01). */
export const CODIGOS_EXCLUIDOS = ["4.03.01.02.03", "4.03.02", "4.07.01"] as const;

/**
 * Itens excluídos em definitivo das tabelas (não existem mais no
 * dre-details.json). Valores por mês conforme o último registro conhecido:
 * 4.03.01.01 → Jul: 80.000,00 | total: 80.000,00
 */
const ITENS_REMOVIDOS: Record<string, Record<string, number>> = {
  "4.03.01.01": { Jul: 80000, total: 80000 },
};

/** Rótulos dos itens excluídos, para as legendas exibidas na UI. */
export const ITENS_EXCLUIDOS_LEGENDA = [
  { itemCod: "4.03.01.01", nome: "REMUNERAÇÃO VARIÁVEL DE SÓCIOS / PROPRIETÁRIOS" },
  { itemCod: "4.03.01.02.03", nome: "COMISSÕES CAPTAÇÃO" },
  { itemCod: "4.03.02", nome: "COMISSÕES E BÔNUS DE TERCEIROS" },
  { itemCod: "4.07", nome: "DESPESAS FINANCEIRAS VARIÁVEIS" },
] as const;

/** Texto padrão de legenda sobre os itens excluídos dos valores. */
export const LEGENDA_EXCLUSAO = `Itens excluídos dos valores de despesas: ${ITENS_EXCLUIDOS_LEGENDA.map(
  (i) => `${i.itemCod} ${i.nome}`,
).join(" · ")}`;

/** Nomenclaturas de grupo exibidas na tabela do DRE. */
export const NOMES_GRUPOS: Record<string, string> = {
  "4.01": "DEDUÇÕES DE RECEITA",
  "4.02": "CUSTOS",
  "4.03": "DESPESAS DE VENDAS",
  "4.04": "DESPESAS ADMINISTRATIVAS",
  "4.07": "DESPESAS FINANCEIRAS VARIÁVEIS",
};

export type ItemDre = {
  grupoCod: string;
  itemCod: string;
  total: number;
} & Record<string, number | string>;

export type GrupoDre = {
  top: string;
  grupoCod: string;
  grupoNome: string;
  total: number;
} & Record<string, number | string>;

const FALLBACK_ITENS: ItemDre[] = detailsFallback as unknown as ItemDre[];
const FALLBACK_GRUPOS: GrupoDre[] = (dashboardFallback as unknown as { dreGroups: GrupoDre[] })
  .dreGroups;

/**
 * true se o itemCod pertence à sub-árvore de um item excluído (usado para
 * marcar as linhas na tabela; para SOMAR valores usar apenas os itemCod exatos,
 * pois o pai já agrega os filhos).
 */
export function itemExcluido(itemCod: string): boolean {
  return (CODIGOS_EXCLUIDOS as readonly string[]).some(
    (c) => itemCod === c || itemCod.startsWith(`${c}.`),
  );
}

/** Grupo com valor inteiramente excluído do total de despesas (4.07 → 4.07.01). */
export function grupoExcluido(grupoCod: string): boolean {
  return grupoCod === "4.07";
}

function numero(v: unknown): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

/** Soma dos grupos de despesa em um mês específico ("Jan".."Dez"). */
export function despesasGruposMes(mes: string, grupos: GrupoDre[] = FALLBACK_GRUPOS): number {
  return (GRUPOS_DESPESA as readonly string[]).reduce((s, gc) => {
    const g = grupos.find((x) => x.grupoCod === gc);
    return s + (g ? numero(g[mes]) : 0);
  }, 0);
}

/** Soma dos itens excluídos (itemCod exatos + fixos removidos) em um mês ("Jan".."Dez"). */
export function valorExcluidoMes(mes: string, lista: ItemDre[] = FALLBACK_ITENS): number {
  const fixo = Object.values(ITENS_REMOVIDOS).reduce((s, m) => s + (m[mes] ?? 0), 0);
  return (
    fixo +
    lista
      .filter((it) => (CODIGOS_EXCLUIDOS as readonly string[]).includes(it.itemCod))
      .reduce((s, it) => s + numero(it[mes]), 0)
  );
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
 *  - despesas = Σ grupos de despesa do mês − itens excluídos do mês
 *  - resultado = receitas − despesas (recalculado)
 *  - margem = receitas ? (resultado / receitas) * 100 : 0 (recalculado)
 * Não muta o array/original nem os registros.
 *
 * `lista`/`grupos` são o dre-details.json e o dreGroups correspondentes aos
 * dados em uso — em produção vêm do repo arquivos_ita (loader da rota); o
 * default é o fallback estático.
 */
export function ajustarDespesas(
  meses: MesDre[],
  lista: ItemDre[] = FALLBACK_ITENS,
  grupos: GrupoDre[] = FALLBACK_GRUPOS,
): MesDre[] {
  return meses.map((m) => {
    const despesas = despesasGruposMes(m.mes, grupos) - valorExcluidoMes(m.mes, lista);
    const resultado = m.receitas - despesas;
    const margem = m.receitas ? (resultado / m.receitas) * 100 : 0;
    return { ...m, despesas, resultado, margem };
  });
}
