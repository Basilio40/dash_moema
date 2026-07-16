import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact, CHART_COLORS } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  PeriodFilter,
  usePeriod,
  filterByMes,
  colunasMes,
  valorMes,
} from "@/components/PeriodFilter";

export const Route = createFileRoute("/centros-custo")({
  head: () => ({
    meta: [
      { title: "Centros de Custo — Italinea 2026" },
      {
        name: "description",
        content: "Gastos mensais consolidados por centro de custo/consultor.",
      },
    ],
  }),
  component: CCPage,
});

type NumRec = Record<string, number>;

function CCPage() {
  const period = usePeriod();
  const stack = filterByMes(data.ccStack as unknown as Array<{ mes: string } & NumRec>, period.mes);
  const top = (data as Record<string, unknown>).topCC as string[];
  const ccAll = (data as Record<string, unknown>).ccAll as unknown as Array<
    {
      centro: string;
    } & Record<string, number>
  >;
  const colunas = colunasMes(period.mes);

  // Total e maior CC conforme o filtro de mês
  const total = ccAll.reduce((s, c) => s + valorMes(c, period.mes), 0);
  const ccComValor = ccAll
    .map((c) => ({
      rec: c,
      valorPeriodo: valorMes(c, period.mes),
    }))
    .sort((a, b) => b.valorPeriodo - a.valorPeriodo);
  const maiorCC = ccComValor[0];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Gastos por Centro de Custo"
        subtitle="Distribuição mensal por centro (ADM, consultores e áreas)"
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Total despesas alocadas" value={brlCompact(total)} tone="negative" />
        <Kpi label="Centros ativos" value={String(data.ccAll.length)} />
        <Kpi
          label="Maior CC"
          value={maiorCC?.rec.centro ?? "—"}
          hint={maiorCC ? brlCompact(maiorCC.valorPeriodo) : ""}
        />
        <Kpi label="Média mensal" value={brlCompact(total / (period.mes === "all" ? 7 : 1))} />
      </div>

      <Panel title="Composição mensal (top 8 centros + outros)">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={stack}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {top.map((cc, i) => (
              <Bar key={cc} dataKey={cc} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
            <Bar dataKey="Outros" stackId="a" fill="#64748B" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="mt-8">
        <Panel title="Ranking completo de centros de custo">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Centro</th>
                  {colunas.map((m) => (
                    <th key={m} className="text-right py-2 px-2">
                      {m}
                    </th>
                  ))}
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {ccComValor.slice(0, 40).map((c, i) => (
                  <tr
                    key={c.rec.centro}
                    className="border-b border-border/50 hover:bg-panel-elevated/50"
                  >
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 text-foreground">{c.rec.centro}</td>
                    {colunas.map((m) => (
                      <td key={m} className="text-right py-2 px-2 text-muted-foreground">
                        {c.rec[m] ? brlCompact(Number(c.rec[m])) : "—"}
                      </td>
                    ))}
                    <td className="text-right py-2 font-semibold text-foreground">
                      {brlCompact(c.valorPeriodo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
