const CODIGOS_GRUPO = {
  receita: "3.01",
  cmv: "4.02",
  vendas: "4.03",
  financeiras: "4.07",
  impostos: "4.01",
  operacional: "4.04",
} as const;

const TAXAS = {
  cmv: 0.4,
  vendas: 0.24,
  financeiras: 0.08,
} as const;

const NOMES_MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export type ProjecaoReceita = {
  mes: string;
  receita: number;
  cmv: number;
  despesasVendas: number;
  despesasFinanceiras: number;
  custosFixos: number;
  resultado: number;
};

function valorGrupo(grupos: Record<string, number | string>[], cod: string, mes: string): number {
  const g = grupos.find((x) => x.grupoCod === cod);
  if (!g) return 0;
  return typeof g[mes] === "number" ? Number(g[mes]) : 0;
}

function media(valores: number[]): number {
  if (!valores.length) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function proximosMeses(
  ultimoMes: string,
  ultimoAno: number,
  quantidade: number,
): { label: string; mes: string; ano: number }[] {
  const idx = NOMES_MESES.indexOf(ultimoMes as (typeof NOMES_MESES)[number]);
  const resultado = [];
  let i = idx;
  let ano = ultimoAno;
  for (let k = 0; k < quantidade; k++) {
    const mes = NOMES_MESES[i];
    resultado.push({
      mes,
      ano,
      label: `${mes}/${ano.toString().slice(-2)}`,
    });
    i += 1;
    if (i >= NOMES_MESES.length) {
      i = 0;
      ano += 1;
    }
  }
  return resultado;
}

/**
 * Calcula a projeção futura de receitas e custos a partir dos grupos DRE.
 *
 * Regras:
 * - Receita: média móvel de 3 meses recursiva (seed = 3 últimos meses reais).
 * - Custo das mercadorias vendidas: 40% da receita projetada.
 * - Despesas com vendas: 24% da receita projetada.
 * - Despesas financeiras variáveis: 8% da receita projetada.
 * - Total dos custos fixos: média dos últimos 3 meses reais dos custos fixos
 *   (impostos 4.01 + despesas operacionais 4.04).
 *
 * @param grupos grupos DRE do dashboard.json
 * @param mesesReais lista de meses disponíveis (ex.: Jan..Jul)
 * @param ultimoAno ano do último mês real (ex.: 2026)
 * @param horizonte quantidade de meses futuros a projetar
 */
export function calcularProjecaoReceitas(
  grupos: Record<string, number | string>[],
  mesesReais: string[],
  ultimoAno: number,
  horizonte = 6,
): ProjecaoReceita[] {
  const receitasReais = mesesReais.map((mes) => valorGrupo(grupos, CODIGOS_GRUPO.receita, mes));

  const custosFixosReais = mesesReais.map(
    (mes) =>
      valorGrupo(grupos, CODIGOS_GRUPO.impostos, mes) +
      valorGrupo(grupos, CODIGOS_GRUPO.operacional, mes),
  );

  const seedReceitas = receitasReais.slice(-3);
  const custosFixos = media(custosFixosReais.slice(-3));

  const futuros = proximosMeses(mesesReais[mesesReais.length - 1], ultimoAno, horizonte);

  const janelaReceitas = [...seedReceitas];

  return futuros.map(({ label }) => {
    const receita = media(janelaReceitas.slice(-3));
    janelaReceitas.push(receita);

    const cmv = receita * TAXAS.cmv;
    const despesasVendas = receita * TAXAS.vendas;
    const despesasFinanceiras = receita * TAXAS.financeiras;
    const resultado = receita - cmv - despesasVendas - despesasFinanceiras - custosFixos;

    return {
      mes: label,
      receita,
      cmv,
      despesasVendas,
      despesasFinanceiras,
      custosFixos,
      resultado,
    };
  });
}
