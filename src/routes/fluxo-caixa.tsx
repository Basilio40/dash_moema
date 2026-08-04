import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import projecaoContratos from "@/data/projecao-contratos.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { PeriodFilter, usePeriod, filterByMes, MESES_CURTOS } from "@/components/PeriodFilter";
import { parse, addMonths, startOfMonth } from "date-fns";
import { enUS } from "date-fns/locale";

export const Route = createFileRoute("/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa — Italinea 2026" },
      {
        name: "description",
        content: "Projeção de fluxo de caixa: entradas e saídas previstas × efetivadas.",
      },
    ],
  }),
  component: FluxoPage,
});

function FluxoPage() {
  const period = usePeriod();
  const fc = filterByMes(data.fluxoCaixa, period.mes);
  const totEntradas = fc.reduce((s, x) => s + x.entradasEfet + x.entradasPrev, 0);
  const totSaidas = fc.reduce((s, x) => s - x.saidasEfet - x.saidasPrev, 0);
  const saldoFinal = fc[fc.length - 1]?.saldoAcum ?? 0;
  const mesesPositivos = fc.filter((m) => m.liquido > 0).length;

  const dreGroups = (data as unknown as { dreGroups: Record<string, number | string>[] }).dreGroups;
  const valorGrupo = (cod: string, mes: string) => {
    const g = dreGroups.find((x) => x.grupoCod === cod);
    if (!g) return 0;
    return mes === "all" ? Number(g.total ?? 0) : Number(g[mes] ?? 0);
  };

  const ebitdaData = MESES_CURTOS.map((mes) => {
    const receita = valorGrupo("3.01", mes);
    const impostos = valorGrupo("4.01", mes);
    const cmv = valorGrupo("4.02", mes);
    const pessoal = valorGrupo("4.03", mes);
    const operacional = valorGrupo("4.04", mes);
    return { mes, receita, ebitda: receita - impostos - cmv - pessoal - operacional };
  }).filter((d) => (period.mes === "all" ? true : d.mes === period.mes));

  const hoje = new Date();
  const inicioPeriodo = startOfMonth(hoje);
  const fimPeriodo = addMonths(inicioPeriodo, 6);

  const parseMesProjecao = (mes: string) =>
    parse(mes, "MMM/yy", new Date(), { locale: enUS });

  const projecaoSeries = projecaoContratos.series
    .map((item) => ({ ...item, data: parseMesProjecao(item.mes) }))
    .filter((item) => item.data >= inicioPeriodo && item.data < fimPeriodo)
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const totalProjecaoPeriodo = projecaoSeries[projecaoSeries.length - 1]?.acumulado ?? 0;
  const totalValorPeriodo = projecaoSeries.reduce((s, x) => s + x.valor, 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Projeção de Fluxo de Caixa"
        subtitle="Entradas × saídas mês a mês — separando efetivado (data do movimento) de previsto (competência)"
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Entradas totais" value={brlCompact(totEntradas)} tone="positive" />
        <Kpi label="Saídas totais" value={brlCompact(totSaidas)} tone="negative" />
        <Kpi
          label="Saldo Acumulado"
          value={brlCompact(saldoFinal)}
          tone={saldoFinal >= 0 ? "positive" : "negative"}
          hint={period.mes === "all" ? "Ao final de Jul/26" : `Em ${period.mes}/26`}
        />
        <Kpi label="Meses positivos" value={`${mesesPositivos} / ${fc.length}`} />
      </div>

      <Panel title="Evolução de EBITDA">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={ebitdaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="ebitda" name="EBITDA" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Projeção de Despesas">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={projecaoSeries}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Area
              type="monotone"
              dataKey="acumulado"
              name="Projeção de vendas (saldo acumulado)"
              stroke="#22D3EE"
              strokeWidth={2.5}
              fill="url(#g)"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Detalhamento mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium">Mês</th>
                  <th className="text-right py-2 px-2 font-medium">Valor do Mês</th>
                  <th className="text-right py-2 px-2 font-medium">Saldo Acumulado</th>
                  <th className="text-right py-2 pl-2 font-medium">% Acumulado</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {projecaoSeries.map((item) => {
                  const pctAcumulado = totalProjecaoPeriodo
                    ? (item.acumulado / totalProjecaoPeriodo) * 100
                    : 0;
                  return (
                    <tr
                      key={item.mes}
                      className="border-b border-border/50 hover:bg-panel-elevated/50 transition"
                    >
                      <td className="py-2 pr-4 text-foreground">{item.mes}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {brlCompact(item.valor)}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold text-foreground">
                        {brlCompact(item.acumulado)}
                      </td>
                      <td className="text-right py-2 pl-2 text-muted-foreground">
                        {pctAcumulado.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/50 font-medium">
                <tr>
                  <td className="py-2 pr-4 text-foreground">Total</td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totalValorPeriodo)}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totalProjecaoPeriodo)}
                  </td>
                  <td className="text-right py-2 pl-2 text-foreground">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
