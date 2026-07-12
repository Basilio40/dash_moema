import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";

export const Route = createFileRoute("/fluxo-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de Caixa — Italinea 2026" }, { name: "description", content: "Projeção de fluxo de caixa: entradas e saídas previstas × efetivadas." }] }),
  component: FluxoPage,
});

function FluxoPage() {
  const fc = data.fluxoCaixa;
  const totEntradas = fc.reduce((s,x)=>s+x.entradasEfet+x.entradasPrev,0);
  const totSaidas = fc.reduce((s,x)=>s-x.saidasEfet-x.saidasPrev,0);
  const saldoFinal = fc[fc.length-1]?.saldoAcum ?? 0;
  const mesesPositivos = fc.filter(m=>m.liquido>0).length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Projeção de Fluxo de Caixa" subtitle="Entradas × saídas mês a mês — separando efetivado (data do movimento) de previsto (competência)" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Entradas totais" value={brlCompact(totEntradas)} tone="positive" />
        <Kpi label="Saídas totais" value={brlCompact(totSaidas)} tone="negative" />
        <Kpi label="Saldo Acumulado" value={brlCompact(saldoFinal)} tone={saldoFinal>=0?"positive":"negative"} hint="Ao final de Jul/26" />
        <Kpi label="Meses positivos" value={`${mesesPositivos} / ${fc.length}`} />
      </div>

      <Panel title="Entradas × Saídas por mês">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={fc} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{fill:"var(--muted-foreground)", fontSize:12}} />
            <YAxis tick={{fill:"var(--muted-foreground)", fontSize:12}} tickFormatter={brlCompact} />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{fontSize:12}} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="entradasEfet" name="Entradas efetivadas" stackId="a" fill="#10B981" radius={[0,0,0,0]} />
            <Bar dataKey="entradasPrev" name="Entradas previstas" stackId="a" fill="#34D399" fillOpacity={0.5} />
            <Bar dataKey="saidasEfet" name="Saídas efetivadas" stackId="a" fill="#F87171" />
            <Bar dataKey="saidasPrev" name="Saídas previstas" stackId="a" fill="#FCA5A5" fillOpacity={0.5} />
            <Line type="monotone" dataKey="liquido" name="Líquido do mês" stroke="#22D3EE" strokeWidth={3} dot={{r:5}} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Panel title="Saldo acumulado (projeção)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={fc}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{fill:"var(--muted-foreground)", fontSize:12}} />
              <YAxis tick={{fill:"var(--muted-foreground)", fontSize:12}} tickFormatter={brlCompact} />
              <Tooltip content={<DarkTooltip />} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Area type="monotone" dataKey="saldoAcum" name="Saldo acumulado" stroke="#22D3EE" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Detalhe mensal">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2">Mês</th>
                  <th className="text-right py-2">Entradas</th>
                  <th className="text-right py-2">Saídas</th>
                  <th className="text-right py-2">Líquido</th>
                  <th className="text-right py-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {fc.map(m => (
                  <tr key={m.mes} className="border-b border-border/50">
                    <td className="py-2 text-foreground font-semibold">{m.mes}</td>
                    <td className="text-right text-[color:var(--success)]">{brl(m.entradasEfet+m.entradasPrev)}</td>
                    <td className="text-right text-destructive">{brl(m.saidasEfet+m.saidasPrev)}</td>
                    <td className={`text-right font-semibold ${m.liquido>=0?"text-[color:var(--success)]":"text-destructive"}`}>{brl(m.liquido)}</td>
                    <td className={`text-right font-bold ${m.saldoAcum>=0?"text-foreground":"text-destructive"}`}>{brl(m.saldoAcum)}</td>
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
