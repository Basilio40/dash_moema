import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact, CHART_COLORS } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/centros-custo")({
  head: () => ({ meta: [{ title: "Centros de Custo — Italinea 2026" }, { name: "description", content: "Gastos mensais consolidados por centro de custo/consultor." }] }),
  component: CCPage,
});

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul"];

function CCPage() {
  const stack = data.ccStack;
  const top = (data as any).topCC as string[];
  const total = data.ccTop.reduce((s: number, x: any) => s + x.total, 0);
  const maiorCC = data.ccTop[0];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Gastos por Centro de Custo" subtitle="Distribuição mensal por centro (ADM, consultores e áreas)" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Total despesas alocadas" value={brlCompact(total)} tone="negative" />
        <Kpi label="Centros ativos" value={String(data.ccAll.length)} />
        <Kpi label="Maior CC" value={maiorCC?.centro ?? "—"} hint={maiorCC ? brlCompact(maiorCC.total) : ""} />
        <Kpi label="Média mensal" value={brlCompact(total / 7)} />
      </div>

      <Panel title="Composição mensal (top 8 centros + outros)">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={stack}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{fill:"var(--muted-foreground)", fontSize:12}} />
            <YAxis tick={{fill:"var(--muted-foreground)", fontSize:12}} tickFormatter={brlCompact} />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{fontSize:11}} />
            {top.map((cc, i) => (
              <Bar key={cc} dataKey={cc} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
            <Bar dataKey="Outros" stackId="a" fill="#64748B" radius={[6,6,0,0]} />
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
                  {MESES.map(m => <th key={m} className="text-right py-2 px-2">{m}</th>)}
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {data.ccAll.slice(0, 40).map((c: any, i: number) => (
                  <tr key={c.centro} className="border-b border-border/50 hover:bg-panel-elevated/50">
                    <td className="py-2 text-muted-foreground">{i+1}</td>
                    <td className="py-2 text-foreground">{c.centro}</td>
                    {MESES.map(m => <td key={m} className="text-right py-2 px-2 text-muted-foreground">{c[m]?brlCompact(c[m]):"—"}</td>)}
                    <td className="text-right py-2 font-semibold text-foreground">{brl(c.total)}</td>
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
