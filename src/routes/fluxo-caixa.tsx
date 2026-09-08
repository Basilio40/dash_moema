import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/dashboard.json";
import details from "@/data/dre-details.json";
import projecaoContratos from "@/data/projecao-contratos.json";
import realizadoFluxo from "@/data/fluxo-caixa-realizado.json";
import previsaoFluxo from "@/data/fluxo-caixa-previsao.json";
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
  ReferenceLine,
} from "recharts";
import { PeriodFilter, usePeriod, MESES_CURTOS } from "@/components/PeriodFilter";

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

  const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const parseMesPrevisao = (mes: string) => {
    const [sigla, ano] = mes.split("/");
    const idx = MESES_PT.indexOf(sigla);
    return idx >= 0 ? new Date(2000 + Number(ano), idx, 1) : null;
  };
  const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
  const rotuloMes = (d: Date) => `${MESES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;

  const excluirMesPrevisao = (m: string) => !["Jul/26", "Ago/26"].includes(m);

  // Custo fixo do negócio: média dos últimos 3 meses do grupo 4.04
  // (4.04.01 REMUNERAÇÃO FIXA + 4.04.02 GASTOS GERAIS ADMINISTRATIVOS).
  // Usado quando a coluna "Saídas previstas" está zerada ou abaixo de R$ 1 mil.
  const dreItems = details as unknown as Record<string, number | string>[];
  const custoFixoPorMes = MESES_CURTOS.map((m) => {
    const remFixa = dreItems.find((g) => g.itemCod === "4.04.01");
    const gastosGerais = dreItems.find((g) => g.itemCod === "4.04.02");
    return (Number(remFixa?.[m] ?? 0) || 0) + (Number(gastosGerais?.[m] ?? 0) || 0);
  }).filter((v) => v > 0);
  const custoFixoMensal =
    custoFixoPorMes.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, custoFixoPorMes.length);

  const previsaoData = (previsaoFluxo as { mes: string; entradas: number; saidas: number }[])
    .filter((d) => filtroMes(d.mes) && excluirMesPrevisao(d.mes))
    .map((d) => {
      // Saídas zeradas ou abaixo de R$ 1 mil → assume o custo fixo
      // (4.04.01 + 4.04.02, média 3 meses)
      const usaCustoFixo = d.saidas < 1000;
      const saidas = usaCustoFixo ? custoFixoMensal : d.saidas;
      return {
        ...d,
        entradas: mediaMovelEntradas,
        saidas,
        saldo: mediaMovelEntradas - saidas,
        usaCustoFixo,
      };
    });

  // Set/27 não existe no relatório de previsão; incluído para cobrir o último
  // mês da projeção de contratos, com entradas pela média móvel e saídas pelo
  // custo fixo (mesma regra dos meses zerados).
  if (period.mes === "all" || "Set".startsWith(period.mes)) {
    previsaoData.push({
      mes: "Set/27",
      entradas: mediaMovelEntradas,
      saidas: custoFixoMensal,
      saldo: mediaMovelEntradas - custoFixoMensal,
      usaCustoFixo: true,
    });
  }

  // Meses com saídas estimadas por custo fixo: sem despesas com vendas
  // (nem no gráfico/tabela, nem nos totais).
  const mesesCustoFixo = new Set(
    previsaoData.filter((d) => d.usaCustoFixo).map((d) => chaveMes(parseMesPrevisao(d.mes)!)),
  );

  const totEntradas = realizadoData.reduce((s, x) => s + x.entradas, 0);
  const totSaidas = realizadoData.reduce((s, x) => s + x.saidas, 0);
  const saldoFinal = realizadoData.reduce((s, x) => s + x.saldo, 0);
  const mesesPositivos = realizadoData.filter((m) => m.saldo > 0).length;
  const ultimoMes = realizadoData[realizadoData.length - 1]?.mes ?? "Ago/26";

  const hoje = new Date();

  // Eixo X do gráfico de previsão: meses da coluna "Previsão de Entrega" do
  // relatório de contratos (loja_18314_MOEMA_CONTRATOS), agregando "Valor da
  // Venda" e o nº de contratos (projetos) por mês. Rótulos já vêm em PT
  // ("Set/26"), produzidos por scripts/gerar_projecao_contratos.py.
  const projecaoSeries = (
    projecaoContratos.series as { mes: string; valor: number; projetos: number }[]
  )
    .map((item) => ({ ...item, data: parseMesPrevisao(item.mes) }))
    .filter((item): item is typeof item & { data: Date } => item.data !== null)
    // Exclui os meses já realizados (Jan–Ago/26): o painel mostra a projeção a
    // partir do mês atual (Set/26). Nota: a chave usa o índice do mês, então
    // Set/26 = "2026-08".
    .filter((item) => chaveMes(item.data) >= "2026-08")
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const TAXAS_DESPESAS = {
    transportadora: 0.064,
    montagem: 0.1,
    liberador: 0.02,
  };
  // Medição: nº de projetos (contratos) com entrega prevista no mês × R$ 180,00.
  const VALOR_MEDICAO_POR_PROJETO = 180;

  const projecaoComDespesas = projecaoSeries.map((item) => {
    const valor = item.valor; // já em reais no JSON
    const projetos = item.projetos;
    const transportadora = valor * TAXAS_DESPESAS.transportadora;
    const medicao = projetos * VALOR_MEDICAO_POR_PROJETO;
    const montagem = valor * TAXAS_DESPESAS.montagem;
    const liberador = valor * TAXAS_DESPESAS.liberador;
    const totalDespesas = transportadora + medicao + montagem + liberador;
    return { ...item, valor, projetos, transportadora, medicao, montagem, liberador, totalDespesas };
  });

  // Une a previsão de entradas/saídas com a projeção de despesas com vendas,
  // casando os meses por data (previsão usa rótulos PT, projeção usa EN).
  const previsaoPorChave = new Map(
    previsaoData
      .map((d) => ({ ...d, data: parseMesPrevisao(d.mes) }))
      .filter((d): d is typeof d & { data: Date } => d.data !== null)
      .map((d) => [chaveMes(d.data), d]),
  );
  const projecaoPorChave = new Map(
    projecaoComDespesas
      .filter((d) => !mesesCustoFixo.has(chaveMes(d.data)))
      .map((d) => [chaveMes(d.data), d]),
  );

  const previsaoUnificada = Array.from(new Set([...previsaoPorChave.keys(), ...projecaoPorChave.keys()]))
    .sort()
    .map((chave) => {
      const previsao = previsaoPorChave.get(chave);
      const projecao = projecaoPorChave.get(chave);
      const data = previsao?.data ?? projecao!.data;
      return {
        mes: rotuloMes(data),
        entradas: previsao ? mediaMovelEntradas : null,
        saidas: previsao?.saidas ?? null,
        despesasVendas: projecao?.totalDespesas ?? null,
        // Saídas totais do mês: previstas + despesas com vendas (usada no gráfico)
        saidasTotais:
          previsao || projecao
            ? (previsao?.saidas ?? 0) + (projecao?.totalDespesas ?? 0)
            : null,
        // Mesma dinâmica do gráfico Realizado (saldo = entradas - saídas),
        // porém somando as despesas com vendas às saídas deste painel.
        // Só existe quando há previsão de entradas para o mês (como na tabela).
        saldo: previsao
          ? mediaMovelEntradas - previsao.saidas - (projecao?.totalDespesas ?? 0)
          : null,
      };
    });

  const totaisDespesas = projecaoComDespesas
    .filter((x) => !mesesCustoFixo.has(chaveMes(x.data)))
    .reduce(
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

      <Panel title="Previsão de Entradas × Saídas — com Projeção de Despesas com Vendas">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={previsaoUnificada}>
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
            <Tooltip content={<DarkTooltip />} formatter={(v) => brl(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="entradas" name="Entradas previstas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidasTotais" name="Saídas Totais" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saldo" name="Saldo" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Detalhamento mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium">Mês</th>
                  <th className="text-right py-2 px-2 font-medium">Entradas previstas</th>
                  <th className="text-right py-2 px-2 font-medium">Saídas previstas</th>
                  <th className="text-right py-2 px-2 font-medium">Transportadora</th>
                  <th className="text-right py-2 px-2 font-medium">Medição</th>
                  <th className="text-right py-2 px-2 font-medium">Montagem</th>
                  <th className="text-right py-2 px-2 font-medium">Liberador</th>
                  <th className="text-right py-2 px-2 font-medium">Despesas com vendas</th>
                  <th className="text-right py-2 px-2 font-medium">Saidas Totais</th>
                  <th className="text-right py-2 pl-2 font-medium">Saldo previsto</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {previsaoUnificada.map((item) => {
                  const projecao = projecaoPorChave.get(
                    chaveMes(parseMesPrevisao(item.mes) ?? new Date()),
                  );
                  const saidasDespesas =
                    (item.saidas ?? 0) + (item.despesasVendas ?? 0);
                  const saldoPrevisto = (item.entradas ?? 0) - saidasDespesas;
                  return (
                    <tr
                      key={item.mes}
                      className="border-b border-border/50 hover:bg-panel-elevated/50 transition"
                    >
                      <td className="py-2 pr-4 text-foreground">{item.mes}</td>
                      <td className="text-right py-2 px-2 text-emerald-600 dark:text-emerald-400">
                        {item.entradas !== null ? brlCompact(item.entradas) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-red-600 dark:text-red-400">
                        {item.saidas !== null ? brlCompact(item.saidas) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {projecao ? brlCompact(projecao.transportadora) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {projecao ? brlCompact(projecao.medicao) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {projecao ? brlCompact(projecao.montagem) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {projecao ? brlCompact(projecao.liberador) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 text-amber-600 dark:text-amber-400">
                        {item.despesasVendas !== null ? brlCompact(item.despesasVendas) : "—"}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold text-foreground">
                        {item.saidas !== null || item.despesasVendas !== null
                          ? brlCompact(saidasDespesas)
                          : "—"}
                      </td>
                      <td
                        className={`text-right py-2 pl-2 font-semibold ${
                          saldoPrevisto >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {item.entradas !== null ? brlCompact(saldoPrevisto) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/50 font-medium">
                <tr>
                  <td className="py-2 pr-4 text-foreground">Total</td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(
                      previsaoUnificada.reduce((s, x) => s + (x.entradas ?? 0), 0),
                    )}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(previsaoUnificada.reduce((s, x) => s + (x.saidas ?? 0), 0))}
                  </td>
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
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(totaisDespesas.totalDespesas)}
                  </td>
                  <td className="text-right py-2 px-2 text-foreground">
                    {brlCompact(
                      previsaoUnificada.reduce(
                        (s, x) => s + (x.saidas ?? 0) + (x.despesasVendas ?? 0),
                        0,
                      ),
                    )}
                  </td>
                  <td className="text-right py-2 pl-2 text-foreground">
                    {brlCompact(
                      previsaoUnificada.reduce(
                        (s, x) => s + (x.entradas ?? 0) - (x.saidas ?? 0) - (x.despesasVendas ?? 0),
                        0,
                      ),
                    )}
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
