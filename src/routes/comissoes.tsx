import { createFileRoute } from "@tanstack/react-router";
import comissoesData from "@/data/comissoes.json";
import { PageHeader, Kpi, Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/comissoes")({
  head: () => ({
    meta: [
      { title: "Comissões — Italinea 2026" },
      {
        name: "description",
        content:
          "Projeção mensal de comissões por função (montador, liberador, vendedor, gerente e medidor) a partir da assinatura dos contratos.",
      },
    ],
  }),
  component: ComissoesPage,
});

type ComissaoMes = {
  mes: string;
  contratos: number;
  valorAssinado?: number;
  valorEntregue?: number;
  montador: number;
  liberador: number;
  vendedor: number;
  gerente: number;
  medidor: number;
  total: number;
};

// Funções e regras de lançamento (aplicadas por scripts/gerar_comissoes.py
// sobre as colunas Assinatura e Valor da Venda do relatório Focco).
const FUNCOES = [
  { key: "montador", nome: "Montador", regra: "10% do valor da venda, 65 dias após a assinatura", cor: "#F59E0B" },
  { key: "liberador", nome: "Liberador", regra: "2% do valor da venda, no mês subsequente à assinatura", cor: "#22D3EE" },
  { key: "vendedor", nome: "Vendedor", regra: "6% do valor da venda, no mês subsequente à assinatura", cor: "#A78BFA" },
  { key: "gerente", nome: "Gerente", regra: "5% do valor da venda, no mês subsequente à assinatura", cor: "#60A5FA" },
  { key: "medidor", nome: "Medidor", regra: "valor fixo de R$ 3.960 por mês", cor: "#F472B6" },
] as const;

// Gráfico de linhas por função + Total (compartilhado pelas visões
// por Assinatura e por Previsão de Entrega).
function GraficoComissoes({ dados }: { dados: ComissaoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="mes"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickFormatter={brlCompact}
        />
        <Tooltip content={<DarkTooltip />} formatter={(v) => brl(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {FUNCOES.map((f) => (
          <Line
            key={f.key}
            dataKey={f.key}
            name={f.nome}
            stroke={f.cor}
            strokeWidth={2}
            dot={{ r: 2.5 }}
          />
        ))}
        <Line
          dataKey="total"
          name="Total"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Tabela mensal com rodapé de totais (compartilhada pelas visões por
// Assinatura e por Previsão de Entrega).
function TabelaComissoes({
  series,
  valorKey,
  valorLabel,
  contratosLabel,
}: {
  series: ComissaoMes[];
  valorKey: "valorAssinado" | "valorEntregue";
  valorLabel: string;
  contratosLabel: string;
}) {
  const totais = FUNCOES.reduce(
    (acc, f) => ({ ...acc, [f.key]: series.reduce((s, m) => s + m[f.key], 0) }),
    {} as Record<(typeof FUNCOES)[number]["key"], number>,
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2 pr-4 font-medium">Mês</th>
            <th className="text-right py-2 px-2 font-medium">{contratosLabel}</th>
            <th className="text-right py-2 px-2 font-medium">{valorLabel}</th>
            {FUNCOES.map((f) => (
              <th key={f.key} className="text-right py-2 px-2 font-medium">
                {f.nome}
              </th>
            ))}
            <th className="text-right py-2 pl-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {series.map((item) => (
            <tr
              key={item.mes}
              className="border-b border-border/50 hover:bg-panel-elevated/50 transition"
            >
              <td className="py-2 pr-4 text-foreground">{item.mes}</td>
              <td className="text-right py-2 px-2 text-muted-foreground">
                {item.contratos || "—"}
              </td>
              <td className="text-right py-2 px-2 text-muted-foreground">
                {item[valorKey] ? brlCompact(Number(item[valorKey])) : "—"}
              </td>
              {FUNCOES.map((f) => (
                <td key={f.key} className="text-right py-2 px-2 text-muted-foreground">
                  {brlCompact(item[f.key])}
                </td>
              ))}
              <td className="text-right py-2 pl-2 font-semibold text-foreground">
                {brlCompact(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/50 font-medium">
          <tr>
            <td className="py-2 pr-4 text-foreground">Total</td>
            <td className="text-right py-2 px-2 text-foreground">
              {series.reduce((s, m) => s + m.contratos, 0)}
            </td>
            <td className="text-right py-2 px-2 text-foreground">
              {brlCompact(series.reduce((s, m) => s + (m[valorKey] ?? 0), 0))}
            </td>
            {FUNCOES.map((f) => (
              <td key={f.key} className="text-right py-2 px-2 text-foreground">
                {brlCompact(totais[f.key])}
              </td>
            ))}
            <td className="text-right py-2 pl-2 text-foreground">
              {brlCompact(series.reduce((s, m) => s + m.total, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ComissoesPage() {
  const dados = comissoesData as unknown as {
    fonte: string;
    totalAssinado: number;
    numContratos: number;
    mesInicio: string;
    mesFim: string;
    series: ComissaoMes[];
    seriesEntrega: ComissaoMes[];
  };
  // Teste: apenas 2026 (meses ".../26"), com as séries exibidas em linhas.
  const series = dados.series.filter((m) => m.mes.endsWith("/26"));
  // Visão por Previsão de Entrega: mesmas regras, data-base trocada —
  // apenas 2026 e 2027.
  const seriesEntrega = dados.seriesEntrega.filter((m) => /\/(26|27)$/.test(m.mes));
  const mesInicioEntrega = seriesEntrega[0]?.mes ?? "";
  const mesFimEntrega = seriesEntrega[seriesEntrega.length - 1]?.mes ?? "";
  const mesInicio = series[0]?.mes ?? dados.mesInicio;
  const mesFim = series[series.length - 1]?.mes ?? dados.mesFim;
  const contratosAno = series.reduce((s, m) => s + m.contratos, 0);
  const baseAssinadaAno = series.reduce((s, m) => s + (m.valorAssinado ?? 0), 0);

  const totalProjetado = series.reduce((s, m) => s + m.total, 0);
  const mediaMensal = totalProjetado / series.length;
  const pico = series.reduce((a, b) => (b.total > a.total ? b : a), series[0]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Comissões"
        subtitle={`Projeção mensal por função a partir da assinatura dos contratos — complementar ao Fluxo de Caixa (apenas 2026: ${mesInicio} a ${mesFim})`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Total projetado"
          value={brlCompact(totalProjetado)}
          tone="negative"
          hint={`${series.length} meses (${mesInicio}–${mesFim})`}
        />
        <Kpi label="Média mensal" value={brlCompact(mediaMensal)} tone="warning" />
        <Kpi label="Mês de pico" value={pico.mes} tone="warning" hint={brlCompact(pico.total)} />
        <Kpi
          label="Base assinada"
          value={brlCompact(baseAssinadaAno)}
          tone="positive"
          hint={`${contratosAno} contratos em ${mesInicio}–${mesFim} (${dados.fonte})`}
        />
      </div>

      <Panel title="Comissões por Função — Projeção Mensal por Assinatura (2026)">
        <GraficoComissoes dados={series} />
        <p className="mt-3 text-xs text-muted-foreground">
          Regras de lançamento: Montador — 10% do valor da venda, 65 dias após a
          assinatura; Liberador — 2%, Vendedor — 6% e Gerente — 5% do valor da
          venda, no mês subsequente à assinatura; Medidor — valor fixo de R$
          3.960 por mês em toda a linha do tempo.
        </p>
      </Panel>

      <div className="mt-6">
        <Panel title="Comissões por Função — Projeção Mensal por Previsão de Entrega (2026–2027)">
          <GraficoComissoes dados={seriesEntrega} />
          <p className="mt-3 text-xs text-muted-foreground">
            Mesmas regras, porém com a data de Previsão de Entrega como
            data-base: Montador — 10% do valor da venda, 65 dias após a entrega
            prevista; Liberador — 2%, Vendedor — 6% e Gerente — 5% do valor da
            venda, no mês subsequente à entrega prevista; Medidor — valor fixo
            de R$ 3.960 por mês em toda a linha do tempo ({mesInicioEntrega} a{" "}
            {mesFimEntrega}).
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Detalhamento mensal — por Assinatura (2026)">
          <TabelaComissoes
            series={series}
            valorKey="valorAssinado"
            valorLabel="Valor assinado"
            contratosLabel="Contratos assinados"
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Detalhamento mensal — por Previsão de Entrega (2026–2027)">
          <TabelaComissoes
            series={seriesEntrega}
            valorKey="valorEntregue"
            valorLabel="Valor com entrega prevista"
            contratosLabel="Contratos com entrega prevista"
          />
        </Panel>
      </div>
    </div>
  );
}
