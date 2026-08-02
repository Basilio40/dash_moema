import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
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

export const Route = createFileRoute("/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira de Clientes — Italinea 2026" },
      {
        name: "description",
        content:
          "Carteira mensal, entrada de novos clientes e valor de investimento previsto por cliente.",
      },
    ],
  }),
  component: CarteiraPage,
});

type NumRec = Record<string, number>;

function CarteiraPage() {
  const period = usePeriod();
  const cart = filterByMes(data.carteira, period.mes);
  const clientes = (data as Record<string, unknown>).clientes as unknown as Array<
    { cliente: string; primeiroMes: string } & NumRec
  >;
  const colunas = colunasMes(period.mes);

  const totalReceita = cart.reduce((s, m) => s + m.total, 0);
  const totalNovos = cart.reduce((s, m) => s + m.novosClientes, 0);
  const ticketMedio = clientes.length ? totalReceita / clientes.length : 0;
  const totalClientes = clientes.length;

  // Ranking de clientes por valor no período selecionado
  const clientesRanking = clientes
    .map((c) => ({
      rec: c,
      valor: valorMes(c, period.mes),
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Carteira de Clientes"
        subtitle="Entrada de novos clientes e valores previstos de investimento mês a mês"
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Clientes no período" value={String(totalClientes)} tone="positive" />
        <Kpi
          label="Novos clientes"
          value={String(totalNovos)}
          hint={period.mes === "all" ? "Primeira compra em 2026" : `Em ${period.mes}/26`}
        />
        <Kpi label="Ticket médio" value={brlCompact(ticketMedio)} />
        <Kpi label="Receita total" value={brlCompact(totalReceita)} tone="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Panel title="Carteira mensal — receita por mês">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={brlCompact}
              />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                isAnimationActive={false}
                dataKey="total"
                name="Receita"
                fill="#22D3EE"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                isAnimationActive={false}
                dataKey="ticketMedio"
                name="Ticket médio"
                fill="#A78BFA"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Novos clientes por mês (valor previsto de investimento)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={brlCompact}
              />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                isAnimationActive={false}
                dataKey="novosValor"
                name="Investimento previsto"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Top clientes — investimento previsto por mês">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border sticky top-0 bg-panel">
              <tr>
                <th className="text-left py-2">Cliente</th>
                <th className="text-left py-2 px-2">1º mês</th>
                {colunas.map((m) => (
                  <th key={m} className="text-right py-2 px-2">
                    {m}
                  </th>
                ))}
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {clientesRanking.map((c) => (
                <tr
                  key={c.rec.cliente}
                  className="border-b border-border/50 hover:bg-panel-elevated/50"
                >
                  <td className="py-2 text-foreground max-w-[280px] truncate">{c.rec.cliente}</td>
                  <td className="py-2 px-2 text-muted-foreground">{c.rec.primeiroMes}</td>
                  {colunas.map((m) => (
                    <td key={m} className="text-right py-2 px-2 text-muted-foreground">
                      {c.rec[m] ? brlCompact(Number(c.rec[m])) : "—"}
                    </td>
                  ))}
                  <td className="text-right py-2 font-semibold text-foreground">
                    {brlCompact(c.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
