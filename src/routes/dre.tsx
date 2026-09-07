import { createFileRoute, Link } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import details from "@/data/dre-details.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact, pct } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Fragment, useState } from "react";
import {
  PeriodFilter,
  usePeriod,
  filterByMes,
  colunasMes,
  valorMes,
} from "@/components/PeriodFilter";
import { ajustarDespesas } from "@/lib/despesas";

export const Route = createFileRoute("/dre")({
  head: () => ({
    meta: [
      { title: "DRE Mensal — Italinea 2026" },
      {
        name: "description",
        content: "Demonstração de resultado mês a mês com detalhamento por grupo.",
      },
    ],
  }),
  component: DrePage,
});

export function DrePage() {
  const [filtro, setFiltro] = useState<"TODOS" | "RECEITAS" | "DESPESAS">("TODOS");
  const [expandido, setExpandido] = useState<string | null>(null);
  const period = usePeriod();
  const dreFiltered = filterByMes(data.dreMonth, period.mes);
  const dreAjustado = ajustarDespesas(dreFiltered);
  const totals = dreAjustado.reduce(
    (a, m) => ({ rec: a.rec + m.receitas, desp: a.desp + m.despesas }),
    { rec: 0, desp: 0 },
  );
  const resultado = totals.rec - totals.desp;
  const margemMedia = totals.rec ? (resultado / totals.rec) * 100 : 0;
  const totalNaoEntregue =
    (data as Record<string, unknown> as { naoEntreguesResumo?: { totalAEntregar?: number } })
      .naoEntreguesResumo?.totalAEntregar ?? 0;
  const totalClientes = data.clientes.length;
  const colunas = colunasMes(period.mes);

  type Grupo = { top: string; grupoCod: string; grupoNome: string; total: number } & Record<
    string,
    number | string
  >;
  const grupos = (data as Record<string, unknown> as { dreGroups: Grupo[] }).dreGroups.filter(
    (g) => filtro === "TODOS" || g.top === filtro,
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="DRE Mensal"
        subtitle="Demonstração do Resultado do Exercício — visão executiva mês a mês"
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Receita Bruta" value={brlCompact(totals.rec)} tone="positive" />
        <Kpi label="Despesas" value={brlCompact(totals.desp)} tone="negative" />
        <Kpi
          label="Resultado"
          value={brlCompact(resultado)}
          tone={resultado >= 0 ? "positive" : "negative"}
        />
        <Kpi
          label="Margem Média"
          value={pct(margemMedia)}
          tone={margemMedia >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <Panel title="Evolução mensal">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={dreAjustado}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={brlCompact}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="receitas"
                  name="Receitas"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="despesas"
                  name="Despesas"
                  fill="#F87171"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado"
                  stroke="#22D3EE"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <Panel title="Break-even vs Receita">
          <div
            className="text-3xl display font-bold mt-2"
            style={{ color: resultado >= 0 ? "var(--success)" : "var(--destructive)" }}
          >
            {pct(margemMedia)}
          </div>
          <div className="text-xs text-muted-foreground mb-4">Margem média no período</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={dreAjustado}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={brlCompact}
              />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="receitas" name="Receita" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="despesas"
                name="Break-even (despesas)"
                fill="#F59E0B"
                radius={[6, 6, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="mt-8">
        <Panel
          title="DRE detalhado por grupo"
          right={
            <div className="flex gap-1 text-xs">
              {(["TODOS", "RECEITAS", "DESPESAS"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-md transition ${
                    filtro === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-panel-elevated text-muted-foreground hover:text-foreground"
                  }`}
                >
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
                  {colunas.map((m) => (
                    <th key={m} className="text-right py-2 px-2 font-medium">
                      {m}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {grupos.map((g: Record<string, number | string>) => {
                  const isOpen = expandido === g.grupoCod;
                  const itens = details.filter((d) => d.grupoCod === g.grupoCod);
                  return (
                    <Fragment key={String(g.top) + String(g.grupoCod)}>
                      <tr
                        onClick={() => setExpandido(isOpen ? null : String(g.grupoCod))}
                        className={`border-b border-border/50 hover:bg-panel-elevated/50 cursor-pointer transition ${
                          isOpen ? "bg-panel-elevated/50" : ""
                        }`}
                      >
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center justify-center w-4 mr-1 text-muted-foreground ${
                              isOpen ? "rotate-90" : ""
                            } transition-transform`}
                          >
                            ▸
                          </span>
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              g.top === "RECEITAS" ? "bg-[color:var(--success)]" : "bg-destructive"
                            }`}
                          ></span>
                          <span className="text-foreground">{g.grupoCod}</span>{" "}
                          <span className="text-muted-foreground">{g.grupoNome}</span>
                        </td>
                        {colunas.map((m) => (
                          <td key={m} className="text-right py-2 px-2 text-muted-foreground">
                            {g[m] ? brlCompact(Number(g[m])) : "—"}
                          </td>
                        ))}
                        <td className="text-right py-2 pl-2 font-semibold text-foreground">
                          {brlCompact(valorMes(g as unknown as Record<string, number>, period.mes))}
                        </td>
                      </tr>
                      {isOpen &&
                        itens.map((it) => (
                          <tr
                            key={String(g.top) + String(it.itemCod)}
                            className="bg-background/30 border-b border-border/30"
                          >
                            <td className="py-2 pr-4 pl-8">
                              <span className="text-muted-foreground">{it.itemCod}</span>{" "}
                              <span className="text-foreground/80">{it.itemNome}</span>
                            </td>
                            {colunas.map((m) => (
                              <td key={m} className="text-right py-2 px-2 text-muted-foreground/80">
                                {(it as Record<string, unknown>)[m]
                                  ? brlCompact(Number((it as Record<string, unknown>)[m]))
                                  : "—"}
                              </td>
                            ))}
                            <td className="text-right py-2 pl-2 text-muted-foreground/80">
                              {brlCompact(
                                valorMes(it as unknown as Record<string, number>, period.mes),
                              )}
                            </td>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <QuickLink
          to="/dre"
          title="DRE mês a mês"
          desc="Receitas, despesas e margem detalhadas por grupo"
        />
        <QuickLink
          to="/fluxo-caixa"
          title="Fluxo de caixa"
          desc="Previsto × efetivado e projeção acumulada"
        />
        <QuickLink
          to="/centros-custo"
          title="Centros de custo"
          desc={`${brlCompact(totalNaoEntregue)} a entregar (líquido)`}
        />
        <QuickLink
          to="/carteira"
          title="Carteira de clientes"
          desc={`${totalClientes} clientes no período`}
        />
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="card-panel p-5 hover:kpi-glow transition-shadow block">
      <div className="display font-semibold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}
