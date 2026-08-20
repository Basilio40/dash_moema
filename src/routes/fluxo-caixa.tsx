import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import projecaoContratos from "@/data/projecao-contratos.json";
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
import { PeriodFilter, usePeriod, filterByMes, MESES_CURTOS } from "@/components/PeriodFilter";
import { calcularProjecaoReceitas } from "@/lib/projecao-receitas";
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

function FluxoPage() {
  const period = usePeriod();
  const fc = filterByMes(data.fluxoCaixa, period.mes);
  const totEntradas = fc.reduce((s, x) => s + x.entradasEfet + x.entradasPrev, 0);
  const totSaidas = fc.reduce((s, x) => s - x.saidasEfet - x.saidasPrev, 0);
  const saldoFinal = fc[fc.length - 1]?.saldoAcum ?? 0;
  const mesesPositivos = fc.filter((m) => m.liquido > 0).length;

  const dreGroups = (data as unknown as { dreGroups: Record<string, number | string>[] }).dreGroups;
  const valorGrupo = (cod: string, mes: string) => {
    const g = dreGroups.find((x) => x.grupoCod === cod);
    if (!g) return 0;
    return mes === "all" ? Number(g.total ?? 0) : Number(g[mes] ?? 0);
  };

  const ebitdaData = MESES_CURTOS.map((mes) => {
    const receita = valorGrupo("3.01", mes);
    const impostos = valorGrupo("4.01", mes);
    const cmv = valorGrupo("4.02", mes);
    const pessoal = valorGrupo("4.03", mes);
    const operacional = valorGrupo("4.04", mes);
    return { mes, receita, ebitda: receita - impostos - cmv - pessoal - operacional };
  }).filter((d) => (period.mes === "all" ? true : d.mes === period.mes));

  const projecaoReceitas = calcularProjecaoReceitas(dreGroups, MESES_CURTOS, 2026);

  const hoje = new Date();
  const inicioPeriodo = startOfMonth(hoje);
  const fimPeriodo = addMonths(inicioPeriodo, 6);

  const parseMesProjecao = (mes: string) => parse(mes, "MMM/yy", new Date(), { locale: enUS });

  const projecaoSeries = projecaoContratos.series
    .map((item) => ({ ...item, data: parseMesProjecao(item.mes) }))
    .filter((item) => item.data >= inicioPeriodo && item.data < fimPeriodo)
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
          hint={period.mes === "all" ? "Ao final de Jul/26" : `Em ${period.mes}/26`}
        />
        <Kpi label="Meses positivos" value={`${mesesPositivos} / ${fc.length}`} />
      </div>

      <Panel title="Evolução de EBITDA">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={ebitdaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="ebitda" name="EBITDA" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
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

      <Panel title="Projeção de Receitas">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={projecaoReceitas}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={brlCompact}
            />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="cmv" name="CMV (40%)" stackId="receita" fill={CHART_COLORS[0]} />
            <Bar
              dataKey="despesasVendas"
              name="Despesas com vendas (24%)"
              stackId="receita"
              fill={CHART_COLORS[1]}
            />
            <Bar
              dataKey="despesasFinanceiras"
              name="Despesas financeiras variáveis (8%)"
              stackId="receita"
              fill={CHART_COLORS[2]}
            />
            <Bar
              dataKey="custosFixos"
              name="Total custos fixos (média 3m)"
              stackId="receita"
              fill={CHART_COLORS[3]}
            />
            <Bar
              dataKey="resultado"
              name="Resultado projetado"
              stackId="receita"
              fill="#10B981"
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
                  <th className="text-right py-2 px-2 font-medium">Receita</th>
                  <th className="text-right py-2 px-2 font-medium">CMV (40%)</th>
                  <th className="text-right py-2 px-2 font-medium">Vendas (24%)</th>
                  <th className="text-right py-2 px-2 font-medium">Financeiras (8%)</th>
                  <th className="text-right py-2 px-2 font-medium">Custos fixos</th>
                  <th className="text-right py-2 pl-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {projecaoReceitas.map((item) => (
                  <tr
                    key={item.mes}
                    className="border-b border-border/50 hover:bg-panel-elevated/50 transition"
                  >
                    <td className="py-2 pr-4 text-foreground">{item.mes}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.receita)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.cmv)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.despesasVendas)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.despesasFinanceiras)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {brlCompact(item.custosFixos)}
                    </td>
                    <td className="text-right py-2 pl-2 font-semibold text-foreground">
                      {brlCompact(item.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/50 font-medium">
                <tr>
                  <td className="py-2 pr-4 text-foreground">Total</td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.receita, 0))}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.cmv, 0))}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.despesasVendas, 0))}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.despesasFinanceiras, 0))}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.custosFixos, 0))}
                  </td>
                  <td className="text-right py-2 pl-2 text-foreground">
                    {brlCompact(projecaoReceitas.reduce((s, x) => s + x.resultado, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
