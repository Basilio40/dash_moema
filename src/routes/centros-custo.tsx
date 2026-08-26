import { createFileRoute, Link } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
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
import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { PeriodFilter, usePeriod } from "@/components/PeriodFilter";

export const Route = createFileRoute("/centros-custo")({
  head: () => ({
    meta: [
      { title: "Centros de Custo — Italinea 2026" },
      {
        name: "description",
        content:
          "Valores gastos em compras de mercadorias por cliente/consultor ainda não plenamente entregues/reconhecidos como custo.",
      },
    ],
  }),
  component: CentrosCustoPage,
});

type ItemNE = {
  mes: string;
  titulo: string;
  obs: string;
  valor: number;
  conta: string;
  fornecedor: string;
  tipo: string;
  categoria?: string;
  tipDoc?: string;
};

type NaoEntregue = {
  centroCusto: string;
  totalCompra: number;
  receita: number;
  aEntregar: number;
  categorias?: Record<string, number>;
  itens: ItemNE[];
};

function getProvisaoTipo(item: ItemNE): "PCP" | "PFP" | "PPC" | null {
  // As provisões devem ser classificadas pelo tipo de documento do Focco
  // (PCP, PPC, PFP), e não pelo nome da conta.
  const tipDoc = (item.tipDoc || "").toUpperCase();
  if (tipDoc === "PCP") return "PCP";
  if (tipDoc === "PPC") return "PPC";
  if (tipDoc === "PFP") return "PFP";
  return null;
}

function isProvisao(item: ItemNE) {
  return getProvisaoTipo(item) !== null;
}

function GanhoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-xl text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {p.dataKey === "pctGanho" ? `${p.value.toFixed(1)}%` : brl(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CentrosCustoPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const period = usePeriod();

  // Filtra itens por mês e recalcula totais por cliente quando um mês é selecionado.
  const items = ((data as Record<string, unknown>).naoEntregues as NaoEntregue[])
    .map((cc) => {
      const itensFiltrados =
        period.mes === "all" ? cc.itens : cc.itens.filter((it) => it.mes === period.mes);
      const totalCompra = itensFiltrados.reduce((s, it) => s + it.valor, 0);
      const despesasProvisionadas = itensFiltrados.reduce(
        (s, it) => (isProvisao(it) ? s + it.valor : s),
        0,
      );
      // Quando filtrando por mês, o "a entregar" é estimado pela proporção dos itens do mês
      const fator = cc.itens.length > 0 ? itensFiltrados.length / cc.itens.length : 0;
      return {
        ...cc,
        itens: itensFiltrados,
        totalCompra,
        despesasProvisionadas,
        aEntregar: period.mes === "all" ? cc.aEntregar : cc.aEntregar * fator,
      };
    })
    .filter((x) => x.aEntregar > 0);

  // Filtro de busca aplicado somente à tabela de detalhamento
  const buscaNorm = busca.trim().toLowerCase();
  const itensTabela = buscaNorm
    ? items.filter((x) => x.centroCusto.toLowerCase().includes(buscaNorm))
    : items;

  const resumo = {
    totalCusto: items.reduce((s, x) => s + x.totalCompra, 0),
    totalReceitas: items.reduce((s, x) => s + x.receita, 0),
    totalAEntregar: items.reduce((s, x) => s + x.aEntregar, 0),
    numClientes: items.length,
  };

  const top10 = items.slice(0, 10).map((x) => ({
    nome: x.centroCusto.slice(0, 22),
    ganho: x.aEntregar,
    pctGanho: x.receita > 0 ? (x.aEntregar / x.receita) * 100 : 0,
  }));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Centros de Custo"
        subtitle="Custo por cliente/consultor (compras + fretes 4.02, comissões 4.03 e financeiro 4.07) frente à receita. “A entregar” é o saldo líquido (receita − custo) dos pedidos pendentes de entrega/faturamento pleno."
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Custo total"
          value={brlCompact(resumo.totalCusto)}
          tone="warning"
          hint={period.mes === "all" ? "Compras + comissões + financeiro" : `Em ${period.mes}/26`}
        />
        <Kpi
          label="Receitas relacionadas"
          value={brlCompact(resumo.totalReceitas)}
          tone="positive"
        />
        <Kpi
          label="A entregar (líquido)"
          value={brlCompact(resumo.totalAEntregar)}
          tone="negative"
          hint={`${resumo.numClientes} clientes · receita − custo`}
        />
        <Kpi
          label="Ticket médio a entregar"
          value={brlCompact(resumo.totalAEntregar / Math.max(1, resumo.numClientes))}
        />
      </div>

      <Panel
        title="Top 10 clientes com maior ganho"
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
            <XAxis
              xAxisId="value"
              type="number"
              tickFormatter={brlCompact}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <XAxis
              xAxisId="pct"
              type="number"
              orientation="top"
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={140}
            />
            <Tooltip content={<GanhoTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              xAxisId="value"
              dataKey="ganho"
              name="Ganho"
              fill="#F59E0B"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              xAxisId="pct"
              dataKey="pctGanho"
              name="% Ganho / Receita"
              fill="#10B981"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="mt-8">
        <Panel title="Detalhamento por cliente / centro de custo">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente / centro de custo por nome…"
              className="w-full sm:w-80 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">
              {itensTabela.length} cliente(s) · {buscaNorm ? "filtrado pela busca" : "mostrando até 50"}
            </span>
          </div>
          <div className="divide-y divide-border">
            {itensTabela.slice(0, buscaNorm ? undefined : 50).map((f) => {
              const isOpen = open === f.centroCusto;
              // Agrupa os itens por categoria, preservando a ordem canônica.
              const catOrder = ["Compra e frete", "Comissões", "Financeiro"];
              const presentCats = catOrder.filter((c) =>
                f.itens.some((it) => (it.categoria || "Compra") === c),
              );
              const cats = presentCats.length > 0 ? presentCats : ["Compra"];
              return (
                <div key={f.centroCusto}>
                  <button
                    onClick={() => setOpen(isOpen ? null : f.centroCusto)}
                    className="w-full flex items-center justify-between py-3 hover:bg-panel-elevated/40 px-2 rounded transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground truncate">{f.centroCusto}</span>
                      {cats.length > 1 && (
                        <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {cats
                            .map((c) =>
                              c === "Compra e frete"
                                ? "Compra"
                                : c === "Comissões"
                                  ? "Comissão"
                                  : c === "Financeiro"
                                    ? "Financ"
                                    : c,
                            )
                            .join("·")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                      <span className="text-[color:var(--success)]">
                        Receita: {brlCompact(f.receita)}
                      </span>
                      <span className="text-muted-foreground">
                        Custo: {brlCompact(f.totalCompra)}
                      </span>
                      <span
                        className="text-muted-foreground"
                        title="Soma das provisões (tipos PCP + PPC + PFP)"
                      >
                        Provisionadas (PCP/PPC/PFP): {brlCompact(f.despesasProvisionadas)}
                      </span>
                      <span className="text-[color:var(--warning)] font-semibold">
                        Ganho: {brlCompact(f.aEntregar)}
                      </span>
                    </div>
                  </button>
                  {isOpen && f.itens.length > 0 && (
                    <div className="pl-8 pb-4 pr-2">
                      {cats.map((cat) => {
                        const catItens = f.itens.filter((it) => (it.categoria || "Compra") === cat);
                        const subtotal = catItens.reduce((s, it) => s + it.valor, 0);
                        return (
                          <div key={cat} className="mb-3 last:mb-0">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/80 border-b border-border/40 pb-1 mb-1">
                              <span className="uppercase tracking-wide">{cat}</span>
                              <span className="font-mono">{brl(subtotal)}</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="text-[10px] uppercase text-muted-foreground">
                                  <tr>
                                    <th className="text-left py-1">Mês</th>
                                    <th className="text-left py-1">Fornecedor</th>
                                    <th className="text-left py-1">Título</th>
                                    <th className="text-left py-1">Conta</th>
                                    <th className="text-left py-1">Observação</th>
                                    <th className="text-right py-1">Valor</th>
                                  </tr>
                                </thead>
                                <tbody className="font-mono">
                                  {catItens.map((it, i) => (
                                    <tr key={i} className="border-t border-border/20">
                                      <td className="py-1 text-muted-foreground">{it.mes}</td>
                                      <td className="py-1 text-foreground">{it.fornecedor}</td>
                                      <td className="py-1 text-muted-foreground">{it.titulo}</td>
                                      <td className="py-1 text-muted-foreground max-w-[220px] truncate">
                                        {it.conta}
                                      </td>
                                      <td className="py-1 text-muted-foreground max-w-[220px] truncate">
                                        {it.obs}
                                      </td>
                                      <td className="py-1 text-right">{brl(it.valor)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between text-xs font-semibold border-t-2 border-border/60 pt-1.5 mt-1">
                        <span className="text-muted-foreground uppercase tracking-wide">
                          Total {f.centroCusto.slice(0, 30)}
                        </span>
                        <span className="font-mono text-[color:var(--warning)]">
                          {brl(f.totalCompra)}
                        </span>
                      </div>
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
