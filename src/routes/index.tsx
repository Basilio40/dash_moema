import { createFileRoute, Link } from "@tanstack/react-router";
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
  Line,
  ComposedChart,
  Legend,
} from "recharts";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const totals = data.dreMonth.reduce(
    (a, m) => ({ rec: a.rec + m.receitas, desp: a.desp + m.despesas }),
    { rec: 0, desp: 0 },
  );
  const resultado = totals.rec - totals.desp;
  const margem = totals.rec ? (resultado / totals.rec) * 100 : 0;
  const ultimoSaldo = data.fluxoCaixa[data.fluxoCaixa.length - 1]?.saldoAcum ?? 0;
  const totalNaoEntregue = (data as any).naoEntreguesResumo?.totalAEntregar ?? 0;
  const totalClientes = data.clientes.length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Painel Executivo - Moema"
        subtitle={`${data.meta.empresa} · ${data.meta.periodo} · ${data.meta.totalRegistros.toLocaleString("pt-BR")} lançamentos`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Receita Total"
          value={brlCompact(totals.rec)}
          tone="positive"
          hint="Jan–Jul 2026"
        />
        <Kpi label="Despesa Total" value={brlCompact(totals.desp)} tone="negative" />
        <Kpi
          label="Resultado"
          value={brlCompact(resultado)}
          tone={resultado >= 0 ? "positive" : "negative"}
          hint={`Margem ${margem.toFixed(1)}%`}
        />
        <Link to="/fornecedores" className="block hover:scale-[1.02] hover:kpi-glow transition-all">
          <Kpi
            label="Compras a Entregar"
            value={brlCompact(totalNaoEntregue)}
            tone="warning"
            hint={`${data.naoEntregues.length} fornecedores · ver pareto →`}
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <Panel title="Receitas × Despesas × Resultado">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data.dreMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={brlCompact}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#F87171" radius={[6, 6, 0, 0]} />
                <Line
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
        <Panel title="Fluxo de Caixa Acumulado">
          <div
            className="text-3xl display font-bold mt-2"
            style={{ color: ultimoSaldo >= 0 ? "var(--success)" : "var(--destructive)" }}
          >
            {brl(ultimoSaldo)}
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            Saldo projetado no final do período
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.fluxoCaixa}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={brlCompact}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="liquido" name="Líquido do mês" radius={[6, 6, 0, 0]}>
                {data.fluxoCaixa.map((d, i) => (
                  <text key={i}>{d.liquido}</text>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          to="/nao-entregues"
          title="A entregar"
          desc={`${brlCompact(totalNaoEntregue)} em compras comprometidas`}
        />
        <QuickLink
          to="/centros-custo"
          title="Centros de custo"
          desc="Gastos por consultor/área mês a mês"
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
