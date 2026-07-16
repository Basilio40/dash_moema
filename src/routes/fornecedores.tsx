import { createFileRoute, Link } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
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
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { PeriodFilter, usePeriod } from "@/components/PeriodFilter";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Compras a Entregar — Italinea 2026" },
      {
        name: "description",
        content:
          "Pareto de gastos por fornecedor em compras a entregar (grupo 4.02). Detalhamento dos comprometimentos por supplier.",
      },
    ],
  }),
  component: FornecedoresPage,
});

type Item = {
  mes: string;
  titulo: string;
  obs: string;
  valor: number;
  valorEntrega?: number;
  conta: string;
  fornecedor: string;
  tipo: string;
  centroCusto?: string;
};

function FornecedoresPage() {
  const [open, setOpen] = useState<string | null>(null);
  const period = usePeriod();

  const { fornecedores, totalGeral } = useMemo(() => {
    const map = new Map<string, { total: number; itens: Item[] }>();

    const source = ((data as Record<string, unknown>).naoEntregues ?? []) as Array<{
      centroCusto: string;
      totalCompra: number;
      receita: number;
      aEntregar: number;
      itens: Item[];
    }>;

    source
      .filter((cc) => cc.aEntregar > 0)
      .map((cc) => ({
        ...cc,
        itens: period.mes === "all" ? cc.itens : cc.itens.filter((it) => it.mes === period.mes),
      }))
      .filter((cc) => cc.itens.length > 0)
      .forEach((cc) => {
        const somaItens = cc.itens.reduce((s, it) => s + it.valor, 0);
        const fator = somaItens > 0 ? cc.aEntregar / somaItens : 0;
        cc.itens.forEach((it) => {
          const key = it.fornecedor || "(sem fornecedor)";
          const cur = map.get(key) ?? { total: 0, itens: [] };
          cur.total += it.valor * fator;
          cur.itens.push({ ...it, centroCusto: cc.centroCusto, valorEntrega: it.valor * fator });
          map.set(key, cur);
        });
      });

    const arr = Array.from(map.entries())
      .map(([fornecedor, v]) => ({ fornecedor, total: v.total, itens: v.itens }))
      .sort((a, b) => b.total - a.total);

    const total = arr.reduce((a, x) => a + x.total, 0);

    // cumulative percentage for the pareto curve
    let acc = 0;
    const withCum = arr.map((x) => {
      acc += x.total;
      return { ...x, pctAcum: (acc / total) * 100 };
    });

    return { fornecedores: withCum, totalGeral: total };
  }, [period.mes]);

  const top = fornecedores.slice(0, 15);
  const top1 = fornecedores[0];
  const numFornecedores = fornecedores.length;
  const top10pct = fornecedores.slice(0, 10).reduce((a, x) => a + x.total, 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <Link
        to="/nao-entregues"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Voltar para A Entregar por Cliente
      </Link>

      <PageHeader
        title="Fornecedores — Pareto de Gastos a Entregar"
        subtitle="Distribuição das compras comprometidas (grupo 4.02) por fornecedor. A curva de Pareto mostra a concentração dos gastos."
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Total a entregar"
          value={brlCompact(totalGeral)}
          tone="warning"
          hint={period.mes === "all" ? "Comprometido líquido" : `Em ${period.mes}/26`}
        />
        <Kpi
          label="Nº de fornecedores"
          value={String(numFornecedores)}
          hint="Fornecedores distintos"
        />
        <Kpi
          label="Maior fornecedor"
          value={top1 ? brlCompact(top1.total) : "—"}
          tone="negative"
          hint={
            top1 ? `${pct((top1.total / totalGeral) * 100)} · ${top1.fornecedor.slice(0, 28)}` : ""
          }
        />
        <Kpi
          label="Top 10 concentracao"
          value={pct((top10pct / totalGeral) * 100)}
          tone={top10pct / totalGeral >= 0.8 ? "negative" : "default"}
          hint="Participação dos 10 maiores"
        />
      </div>

      <Panel
        title="Pareto de gastos por fornecedor (Top 15)"
        right={
          <div className="flex items-center gap-4 text-[10px] uppercase text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "#F59E0B" }} />{" "}
              Valor
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "#22D3EE" }} />{" "}
              % acumulado
            </span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={top} margin={{ left: 8, right: 16, top: 16, bottom: 90 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="fornecedor"
              type="category"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={90}
              tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={brlCompact}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <ReferenceLine yAxisId="right" y={80} stroke="#F87171" strokeDasharray="4 4" />
            <Bar
              yAxisId="left"
              dataKey="total"
              name="Valor comprometido"
              fill="#F59E0B"
              radius={[6, 6, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pctAcum"
              name="% acumulado"
              stroke="#22D3EE"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Linha vermelha tracejada marca 80% — regra de Pareto. Fornecedores à esquerda desse limite
          concentram a maior parte dos gastos. Valores proporcionais ao saldo a entregar por cliente
          (compras totais menos receitas já reconhecidas).
        </div>
      </Panel>

      <div className="mt-8">
        <Panel title="Detalhamento por fornecedor">
          <div className="divide-y divide-border">
            {fornecedores.map((f, idx) => {
              const isOpen = open === f.fornecedor;
              const part = (f.total / totalGeral) * 100;
              return (
                <div key={f.fornecedor}>
                  <button
                    onClick={() => setOpen(isOpen ? null : f.fornecedor)}
                    className="w-full flex items-center justify-between py-3 hover:bg-panel-elevated/40 px-2 rounded transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground w-6">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="font-medium text-foreground truncate">{f.fornecedor}</span>
                      {idx === 0 && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[color:var(--warning)]/15 text-[color:var(--warning)]">
                          Top 1
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                      <span className="text-muted-foreground">{f.itens.length} itens</span>
                      <span className="text-muted-foreground w-14 text-right">{pct(part)}</span>
                      <span className="text-[color:var(--warning)] font-semibold w-24 text-right">
                        {brlCompact(f.total)}
                      </span>
                    </div>
                  </button>
                  {isOpen && f.itens.length > 0 && (
                    <div className="pl-10 pb-4 pr-2 overflow-x-auto">
                      <div className="mb-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{brl(f.total)}</strong> comprometido
                        </span>
                        <span>
                          <strong className="text-foreground">{pct(part)}</strong> do total
                        </span>
                        <span>
                          <strong className="text-foreground">{pct(f.pctAcum)}</strong> acumulado
                        </span>
                        <span>
                          <strong className="text-foreground">{f.itens.length}</strong> títulos
                        </span>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="text-[10px] uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left py-1">Mês</th>
                            <th className="text-left py-1">Cliente / CC</th>
                            <th className="text-left py-1">Título</th>
                            <th className="text-left py-1">Conta</th>
                            <th className="text-left py-1">Observação</th>
                            <th className="text-right py-1">Valor compra</th>
                            <th className="text-right py-1">A entregar</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {f.itens
                            .slice()
                            .sort((a, b) => (b.valorEntrega ?? 0) - (a.valorEntrega ?? 0))
                            .map((it, i) => (
                              <tr key={i} className="border-t border-border/30">
                                <td className="py-1 text-muted-foreground">{it.mes}</td>
                                <td className="py-1 text-foreground">{it.centroCusto}</td>
                                <td className="py-1 text-muted-foreground">{it.titulo}</td>
                                <td className="py-1 text-muted-foreground max-w-[240px] truncate">
                                  {it.conta}
                                </td>
                                <td className="py-1 text-muted-foreground max-w-[220px] truncate">
                                  {it.obs}
                                </td>
                                <td className="py-1 text-right text-muted-foreground">
                                  {brl(it.valor)}
                                </td>
                                <td className="py-1 text-right text-[color:var(--warning)]">
                                  {brl(it.valorEntrega ?? 0)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border/60 font-semibold">
                            <td colSpan={6} className="py-1 text-right text-muted-foreground">
                              Total {f.fornecedor.slice(0, 24)}:
                            </td>
                            <td className="py-1 text-right text-[color:var(--warning)]">
                              {brl(f.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
