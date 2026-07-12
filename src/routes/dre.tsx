import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import details from "@/data/dre-details.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact, pct } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Fragment, useState } from "react";

export const Route = createFileRoute("/dre")({
  head: () => ({ meta: [{ title: "DRE Mensal — Italinea 2026" }, { name: "description", content: "Demonstração de resultado mês a mês com detalhamento por grupo." }] }),
  component: DrePage,
});

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul"];

function DrePage() {
  const [filtro, setFiltro] = useState<"TODOS"|"RECEITAS"|"DESPESAS">("TODOS");
  const [expandido, setExpandido] = useState<string | null>(null);
  const totals = data.dreMonth.reduce((a,m)=>({rec:a.rec+m.receitas,desp:a.desp+m.despesas}),{rec:0,desp:0});
  const resultado = totals.rec - totals.desp;
  const margemMedia = totals.rec ? resultado/totals.rec*100 : 0;

  const grupos = (data as any).dreGroups.filter((g: any) => filtro === "TODOS" || g.top === filtro);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader title="DRE Mensal" subtitle="Demonstração do Resultado do Exercício — visão executiva mês a mês" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Receita Bruta" value={brlCompact(totals.rec)} tone="positive" />
        <Kpi label="Despesas" value={brlCompact(totals.desp)} tone="negative" />
        <Kpi label="Resultado" value={brlCompact(resultado)} tone={resultado>=0?"positive":"negative"} />
        <Kpi label="Margem Média" value={pct(margemMedia)} tone={margemMedia>=0?"positive":"negative"} />
      </div>

      <Panel title="Evolução mensal">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={data.dreMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{fill:"var(--muted-foreground)", fontSize:12}} />
            <YAxis yAxisId="left" tick={{fill:"var(--muted-foreground)", fontSize:12}} tickFormatter={brlCompact} />
            <YAxis yAxisId="right" orientation="right" tick={{fill:"var(--muted-foreground)", fontSize:12}} tickFormatter={(v)=>`${v}%`} />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{fontSize:12}} />
            <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill="#10B981" radius={[6,6,0,0]} />
            <Bar yAxisId="left" dataKey="despesas" name="Despesas" fill="#F87171" radius={[6,6,0,0]} />
            <Line yAxisId="left" type="monotone" dataKey="resultado" name="Resultado" stroke="#22D3EE" strokeWidth={3} dot={{r:4}} />
            <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem %" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <div className="mt-8">
        <Panel
          title="DRE detalhado por grupo"
          right={
            <div className="flex gap-1 text-xs">
              {(["TODOS","RECEITAS","DESPESAS"] as const).map(f => (
                <button key={f} onClick={()=>setFiltro(f)}
                  className={`px-3 py-1.5 rounded-md transition ${filtro===f?"bg-primary text-primary-foreground":"bg-panel-elevated text-muted-foreground hover:text-foreground"}`}>
                  {f}
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium">Grupo</th>
                  {MESES.map(m => <th key={m} className="text-right py-2 px-2 font-medium">{m}</th>)}
                  <th className="text-right py-2 pl-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {grupos.map((g:any) => {
                  const isOpen = expandido === g.grupoCod;
                  const itens = details.filter((d:any) => d.grupoCod === g.grupoCod);
                  return (
                    <Fragment key={g.top+g.grupoCod}>
                      <tr
                        onClick={() => setExpandido(isOpen ? null : g.grupoCod)}
                        className={`border-b border-border/50 hover:bg-panel-elevated/50 cursor-pointer transition ${isOpen ? "bg-panel-elevated/50" : ""}`}>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center justify-center w-4 mr-1 text-muted-foreground ${isOpen ? "rotate-90" : ""} transition-transform`}>▸</span>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${g.top==="RECEITAS"?"bg-[color:var(--success)]":"bg-destructive"}`}></span>
                          <span className="text-foreground">{g.grupoCod}</span> <span className="text-muted-foreground">{g.grupoNome}</span>
                        </td>
                        {MESES.map(m => <td key={m} className="text-right py-2 px-2 text-muted-foreground">{g[m]?brlCompact(g[m]):"—"}</td>)}
                        <td className="text-right py-2 pl-2 font-semibold text-foreground">{brlCompact(g.total)}</td>
                      </tr>
                      {isOpen && itens.map(it => (
                        <tr key={g.top+it.itemCod} className="bg-background/30 border-b border-border/30">
                          <td className="py-2 pr-4 pl-8">
                            <span className="text-muted-foreground">{it.itemCod}</span> <span className="text-foreground/80">{it.itemNome}</span>
                          </td>
                          {MESES.map(m => <td key={m} className="text-right py-2 px-2 text-muted-foreground/80">{(it as any)[m]?brlCompact((it as any)[m]):"—"}</td>)}
                          <td className="text-right py-2 pl-2 text-muted-foreground/80">{brlCompact((it as any).total)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
