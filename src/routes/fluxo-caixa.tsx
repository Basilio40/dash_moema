import { createFileRoute } from "@tanstack/react-router";
import { useState, Fragment } from "react";
import data from "@/data/dashboard.json";
import projecaoContratos from "@/data/projecao-contratos.json";
import realizadoFluxo from "@/data/fluxo-caixa-realizado.json";
import previsaoFluxo from "@/data/fluxo-caixa-previsao.json";
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
  ReferenceLine,
} from "recharts";
import { PeriodFilter, usePeriod, MESES_CURTOS, colunasMes, valorMes } from "@/components/PeriodFilter";
import { parse, addMonths, startOfMonth } from "date-fns";
import { enUS } from "date-fns/locale";

export const Route = createFileRoute("/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa — Italinea 2026" },
      {
        name: "description",
        content: "Projeção de fluxo de caixa: entradas e saídas previstas × efetivadas.",
      },
    ],
  }),
  component: FluxoPage,
});

type NumRec = Record<string, number>;

type ClienteRec = { cliente: string; primeiroMes: string } & NumRec;

function DrillDownClientes({ mes }: { mes: string }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const colunas = colunasMes(mes);

  const clientes = (data as Record<string, unknown>).clientes as unknown as ClienteRec[];

  const filtrados = clientes
    .filter((c) => c.cliente.toLowerCase().includes(busca.trim().toLowerCase()))
    .map((c) => ({ rec: c, valor: valorMes(c, mes) }))
    .sort((a, b) => b.valor - a.valor);

  const totalFiltrado = filtrados.reduce((s, c) => s + c.valor, 0);

  return (
    <Panel title="Drill-down por cliente">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente por nome…"
          className="w-full sm:w-80 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">
          {filtrados.length} cliente(s) · Total: {brlCompact(totalFiltrado)}
        </span>
      </div>

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
            {filtrados.map((c) => {
              const expandido = aberto === c.rec.cliente;
              return (
                <Fragment key={c.rec.cliente}>
                  <tr
                    onClick={() => setAberto(expandido ? null : c.rec.cliente)}
                    className="border-b border-border/50 hover:bg-panel-elevated/50 cursor-pointer transition"
                  >
                    <td className="py-2 pr-2 text-foreground max-w-[280px] truncate">
                      <span className="mr-1 text-muted-foreground">{expandido ? "▾" : "▸"}</span>
                      {c.rec.cliente}
                    </td>
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
                  {expandido && (
                    <tr className="border-b border-border/50">
                      <td colSpan={colunas.length + 3} className="p-4 bg-muted/30">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={colunas.map((m) => ({ mes: m, valor: Number(c.rec[m] ?? 0) }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                              dataKey="mes"
                              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                            />
                            <YAxis
                              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                              tickFormatter={brlCompact}
                            />
                            <Tooltip content={<DarkTooltip />} formatter={(v) => brl(Number(v))} />
                            <Bar
                              dataKey="valor"
                              name={c.rec.cliente}
                              fill="#22D3EE"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={colunas.length + 3} className="py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado para “{busca}”.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t bg-muted/50 font-medium">
            <tr>
              <td className="py-2 text-foreground">Total ({filtrados.length})</td>
              <td />
              {colunas.map((m) => (
                <td key={m} className="text-right py-2 text-foreground">
                  {brlCompact(filtrados.reduce((s, c) => s + Number(c.rec[m] ?? 0), 0))}
                </td>
              ))}
              <td className="text-right py-2 text-foreground">{brlCompact(totalFiltrado)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function FluxoPage() {
  const period = usePeriod();
  const filtroMes = (m: string) => (period.mes === "all" ? true : m.startsWith(period.mes));

  const realizadoData = (realizadoFluxo as { mes: string; entradas: number; saidas: number }[])
    .filter((d) => filtroMes(d.mes))
    .map((d) => ({ ...d, saldo: d.entradas - d.saidas }));

  const dreGroups = (data as unknown as { dreGroups: Record<string, number | string>[] }).dreGroups;

  // Meses reais considerados: Jul é descartado (junto com Ago) nas projeções,
  // então a média móvel usa Abr/Mai/Jun (item 7.50.01 TOTAL DAS RECEITAS).
  const MESES_EXCLUIDOS = ["Jul", "Ago"];
  const mesesReaisBase = MESES_CURTOS.filter((m) => !MESES_EXCLUIDOS.includes(m));
  const receitasMensais = mesesReaisBase.map((m) => {
    const grupo = dreGroups.find((g) => g.grupoCod === "3.01");
    return typeof grupo?.[m] === "number" ? Number(grupo[m]) : 0;
  });
  const mediaMovelEntradas =
    receitasMensais.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, receitasMensais.length);

  const excluirMesPrevisao = (m: string) => !["Jul/26", "Ago/26"].includes(m);
  const previsaoData = (previsaoFluxo as { mes: string; entradas: number; saidas: number }[])
    .filter((d) => filtroMes(d.mes) && excluirMesPrevisao(d.mes))
    .map((d) => ({
      ...d,
      entradas: mediaMovelEntradas,
      saldo: mediaMovelEntradas - d.saidas,
    }));

  const totEntradas = realizadoData.reduce((s, x) => s + x.entradas, 0);
  const totSaidas = realizadoData.reduce((s, x) => s + x.saidas, 0);
  const saldoFinal = realizadoData.reduce((s, x) => s + x.saldo, 0);
  const mesesPositivos = realizadoData.filter((m) => m.saldo > 0).length;
  const ultimoMes = realizadoData[realizadoData.length - 1]?.mes ?? "Ago/26";

  const hoje = new Date();
  const inicioPeriodo = startOfMonth(hoje);
  const fimPeriodo = addMonths(inicioPeriodo, 6);

  const parseMesProjecao = (mes: string) => parse(mes, "MMM/yy", new Date(), { locale: enUS });

  const projecaoSeries = projecaoContratos.series
    .map((item) => ({ ...item, data: parseMesProjecao(item.mes) }))
    .filter(
      (item) =>
        item.data >= inicioPeriodo &&
        item.data < fimPeriodo &&
        !["Jul/26", "Aug/26"].includes(item.mes),
    )
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const TAXAS_DESPESAS = {
    transportadora: 0.064,
    medicao: 0.007,
    montagem: 0.1,
    liberador: 0.02,
  };

  const projecaoComDespesas = projecaoSeries.map((item) => {
    const valor = item.valor / 100;
    const transportadora = valor * TAXAS_DESPESAS.transportadora;
    const medicao = valor * TAXAS_DESPESAS.medicao;
    const montagem = valor * TAXAS_DESPESAS.montagem;
    const liberador = valor * TAXAS_DESPESAS.liberador;
    const totalDespesas = transportadora + medicao + montagem + liberador;
    return { ...item, valor, transportadora, medicao, montagem, liberador, totalDespesas };
  });

  const totaisDespesas = projecaoComDespesas.reduce(
    (s, x) => ({
      transportadora: s.transportadora + x.transportadora,
      medicao: s.medicao + x.medicao,
      montagem: s.montagem + x.montagem,
      liberador: s.liberador + x.liberador,
      totalDespesas: s.totalDespesas + x.totalDespesas,
    }),
    { transportadora: 0, medicao: 0, montagem: 0, liberador: 0, totalDespesas: 0 },
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Projeção de Fluxo de Caixa"
        subtitle="Entradas × saídas mês a mês — separando efetivado (data do movimento) de previsto (competência)"
        actions={<PeriodFilter value={period} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Entradas totais" value={brlCompact(totEntradas)} tone="positive" />
        <Kpi label="Saídas totais" value={brlCompact(totSaidas)} tone="negative" />
        <Kpi
          label="Saldo Acumulado"
          value={brlCompact(saldoFinal)}
          tone={saldoFinal >= 0 ? "positive" : "negative"}
          hint={period.mes === "all" ? `Ao final de ${ultimoMes}` : `Em ${period.mes}/26`}
        />
        <Kpi label="Meses positivos" value={`${mesesPositivos} / ${realizadoData.length}`} />
      </div>

      <Panel title="Entradas × Saídas — Realizado">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={realizadoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} formatter={(v) => brl(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saldo" name="Saldo" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Previsão de Entradas × Saídas">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={previsaoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} formatter={(v) => brl(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="entradas" name="Entradas previstas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas previstas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saldo" name="Saldo" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Projeção de Despesas">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={projecaoComDespesas}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar
              dataKey="transportadora"
              name="Transportadora (6,4%)"
              stackId="despesas"
              fill={CHART_COLORS[0]}
            />
            <Bar
              dataKey="medicao"
              name="Medição (0,7%)"
              stackId="despesas"
              fill={CHART_COLORS[1]}
            />
            <Bar
              dataKey="montagem"
              name="Montagem (10%)"
              stackId="despesas"
              fill={CHART_COLORS[2]}
            />
            <Bar
              dataKey="liberador"
              name="Liberador (2%)"
              stackId="despesas"
              fill={CHART_COLORS[3]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Detalhamento mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium">Mês</th>
                  <th className="text-right py-2 px-2 font-medium">Transportadora</th>
                  <th className="text-right py-2 px-2 font-medium">Medição</th>
                  <th className="text-right py-2 px-2 font-medium">Montagem</th>
                  <th className="text-right py-2 px-2 font-medium">Liberador</th>
                  <th className="text-right py-2 pl-2 font-medium">Total Despesas</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {projecaoComDespesas.map((item) => (
                  <tr
                    key={item.mes}
                    className="border-b border-border/50 hover:bg-panel-elevated/50 transition"
                  >
                    <td className="py-2 pr-4 text-foreground">{item.mes}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.transportadora)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.medicao)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.montagem)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.liberador)}
                    </td>
                    <td className="text-right py-2 pl-2 font-semibold text-foreground">
                      {brlCompact(item.totalDespesas)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/50 font-medium">
                <tr>
                  <td className="py-2 pr-4 text-foreground">Total</td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totaisDespesas.transportadora)}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totaisDespesas.medicao)}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totaisDespesas.montagem)}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totaisDespesas.liberador)}
                  </td>
                  <td className="text-right py-2 pl-2 text-foreground">
                    {brlCompact(totaisDespesas.totalDespesas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Panel>

      <DrillDownClientes mes={period.mes} />
    </div>
  );
}
