import { createFileRoute, Link } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/nao-entregues")({
  head: () => ({ meta: [{ title: "A Entregar por Cliente — Italinea 2026" }, { name: "description", content: "Valores gastos em compras de mercadorias por cliente/consultor ainda não plenamente entregues/reconhecidos como custo." }] }),
  component: NaoEntreguesPage,
});

function NaoEntreguesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const resumo = (data as any).naoEntreguesResumo;
  const items = (data as any).naoEntregues.filter((x: any) => x.aEntregar > 0);
  const top10 = items.slice(0, 10).map((x: any) => ({
    nome: x.centroCusto.slice(0, 22),
    aEntregar: x.aEntregar,
    compra: x.totalCompra,
  }));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Compras a Entregar por Cliente"
        subtitle="Valores gastos com compras de mercadorias (grupo 4.02) por cliente/consultor — proxy de comprometimento em pedidos ainda pendentes de entrega/faturamento pleno."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Compras totais" value={brlCompact(resumo.totalCompras)} tone="warning" hint="Custo de mercadorias 2026" />
        <Kpi label="Receitas relacionadas" value={brlCompact(resumo.totalReceitas)} tone="positive" />
        <Kpi label="Comprometido (a entregar)" value={brlCompact(resumo.totalAEntregar)} tone="negative" hint={`${resumo.numClientes} clientes`} />
        <Kpi label="Ticket médio a entregar" value={brlCompact(resumo.totalAEntregar / Math.max(1, resumo.numClientes))} />
      </div>

      <Panel
        title="Top 10 clientes com maior valor a entregar"
        right={
          <Link
            to="/fornecedores"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver por fornecedor (Pareto) <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={top10} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tickFormatter={brlCompact} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={140} />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="compra" name="Compra total" fill="#60A5FA" radius={[0, 4, 4, 0]} />
            <Bar dataKey="aEntregar" name="A entregar" fill="#F59E0B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="mt-8">
        <Panel title="Detalhamento por cliente / centro de custo">
          <div className="divide-y divide-border">
            {items.slice(0, 50).map((f: any) => {
              const isOpen = open === f.centroCusto;
              return (
                <div key={f.centroCusto}>
                  <button
                    onClick={() => setOpen(isOpen ? null : f.centroCusto)}
                    className="w-full flex items-center justify-between py-3 hover:bg-panel-elevated/40 px-2 rounded transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium text-foreground truncate">{f.centroCusto}</span>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                      <span className="text-muted-foreground">Compra: {brlCompact(f.totalCompra)}</span>
                      <span className="text-[color:var(--success)]">Receita: {brlCompact(f.receita)}</span>
                      <span className="text-[color:var(--warning)] font-semibold">A entregar: {brlCompact(f.aEntregar)}</span>
                    </div>
                  </button>
                  {isOpen && f.itens.length > 0 && (
                    <div className="pl-8 pb-4 pr-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-[10px] uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left py-1">Mês</th>
                            <th className="text-left py-1">Fornecedor</th>
                            <th className="text-left py-1">Título</th>
                            <th className="text-left py-1">Observação</th>
                            <th className="text-right py-1">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {f.itens.map((it: any, i: number) => (
                            <tr key={i} className="border-t border-border/30">
                              <td className="py-1 text-muted-foreground">{it.mes}</td>
                              <td className="py-1 text-foreground">{it.fornecedor}</td>
                              <td className="py-1 text-muted-foreground">{it.titulo}</td>
                              <td className="py-1 text-muted-foreground max-w-[280px] truncate">{it.obs}</td>
                              <td className="py-1 text-right">{brl(it.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
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
