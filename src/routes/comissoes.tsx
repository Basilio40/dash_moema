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

// Fim fixo da projeção exibida: dezembro de 2027.
const FIM_PROJECAO = { ano: 2027, mes: 12 };

const ABR_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NUM_MESES: Record<string, number> = Object.fromEntries(
  ABR_MESES.map((abr, i) => [abr, i + 1]),
);

type ChaveMes = { ano: number; mes: number };

// "Out/26" -> { ano: 2026, mes: 10 }
function chaveMes(rotulo: string): ChaveMes | null {
  const [abr, ano] = rotulo.split("/");
  const mes = NUM_MESES[abr];
  return mes && ano ? { mes, ano: 2000 + Number(ano) } : null;
}

// { ano: 2026, mes: 10 } -> "Out/26"
function rotuloMes(chave: ChaveMes): string {
  return `${ABR_MESES[chave.mes - 1]}/${String(chave.ano).slice(2)}`;
}

function proximaChave(chave: ChaveMes): ChaveMes {
  return chave.mes === 12
    ? { ano: chave.ano + 1, mes: 1 }
    : { ano: chave.ano, mes: chave.mes + 1 };
}

function depoisDe(a: ChaveMes, b: ChaveMes): boolean {
  return a.ano > b.ano || (a.ano === b.ano && a.mes > b.mes);
}

// Mês de referência do relatório (ex.: "SET_2026.xlsx" -> set/2026).
// Os meses até ele já estão decorridos; a projeção começa no seguinte —
// o corte acompanha automaticamente o relatório mais recente.
function mesReferencia(fonte: string): ChaveMes | null {
  const m = /^([A-Za-z]{3})_(\d{4})/.exec(fonte);
  if (!m) return null;
  const abr = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  const mes = NUM_MESES[abr];
  return mes ? { mes, ano: Number(m[2]) } : null;
}

// Gráfico de linhas por função + Total.
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

// Tabela mensal com rodapé de totais.
function TabelaComissoes({ series }: { series: ComissaoMes[] }) {
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
            <th className="text-right py-2 px-2 font-medium">Contratos assinados</th>
            <th className="text-right py-2 px-2 font-medium">Valor assinado</th>
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
                {item.valorAssinado ? brlCompact(Number(item.valorAssinado)) : "—"}
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
              {brlCompact(series.reduce((s, m) => s + (m.valorAssinado ?? 0), 0))}
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
    regras: { medidor: { valorMensal: number } };
    series: ComissaoMes[];
  };
  const valorMedidor = dados.regras?.medidor?.valorMensal ?? 3960;

  // Apenas a projeção: descarta os meses já decorridos (até o mês de
  // referência do relatório) e estende a linha do tempo até dez/2027 —
  // após o último lançamento dos contratos assinados permanece somente
  // o custo fixo do Medidor.
  const referencia = mesReferencia(dados.fonte);
  const futuros = referencia
    ? dados.series.filter((m) => {
        const chave = chaveMes(m.mes);
        return chave !== null && depoisDe(chave, referencia);
      })
    : dados.series;
  const mesFimDados = dados.series[dados.series.length - 1]?.mes ?? dados.mesFim;

  const projecao: ComissaoMes[] = [...futuros];
  let chave = chaveMes(projecao[projecao.length - 1]?.mes ?? mesFimDados)
    ?? (referencia ? proximaChave(referencia) : FIM_PROJECAO);
  while (depoisDe(FIM_PROJECAO, chave)) {
    chave = proximaChave(chave);
    projecao.push({
      mes: rotuloMes(chave),
      contratos: 0,
      valorAssinado: 0,
      montador: 0,
      liberador: 0,
      vendedor: 0,
      gerente: 0,
      medidor: valorMedidor,
      total: valorMedidor,
    });
  }

  const mesInicio = projecao[0]?.mes ?? dados.mesInicio;
  const mesFim = projecao[projecao.length - 1]?.mes ?? dados.mesFim;

  const totalProjetado = projecao.reduce((s, m) => s + m.total, 0);
  const mediaMensal = totalProjetado / projecao.length;
  const pico = projecao.reduce((a, b) => (b.total > a.total ? b : a), projecao[0]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Comissões"
        subtitle={`Projeção mensal por função a partir da assinatura dos contratos — apenas meses futuros: ${mesInicio} a ${mesFim}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Total projetado"
          value={brlCompact(totalProjetado)}
          tone="negative"
          hint={`${projecao.length} meses (${mesInicio}–${mesFim})`}
        />
        <Kpi label="Média mensal" value={brlCompact(mediaMensal)} tone="warning" />
        <Kpi label="Mês de pico" value={pico.mes} tone="warning" hint={brlCompact(pico.total)} />
        <Kpi
          label="Base assinada"
          value={brlCompact(dados.totalAssinado)}
          tone="positive"
          hint={`${dados.numContratos} contratos no relatório ${dados.fonte}`}
        />
      </div>

      <Panel title={`Comissões por Função — Projeção Mensal por Assinatura (${mesInicio}–${mesFim})`}>
        <GraficoComissoes dados={projecao} />
        <p className="mt-3 text-xs text-muted-foreground">
          Regras de lançamento: Montador — 10% do valor da venda, 65 dias após a
          assinatura; Liberador — 2%, Vendedor — 6% e Gerente — 5% do valor da
          venda, no mês subsequente à assinatura; Medidor — valor fixo de R${" "}
          {brl(valorMedidor)} por mês em toda a linha do tempo. A partir de{" "}
          {mesFimDados}, com todos os contratos assinados já lançados, resta
          apenas o custo fixo do Medidor projetado até {mesFim}.
        </p>
      </Panel>

      <div className="mt-6">
        <Panel title={`Detalhamento mensal — por Assinatura (projeção ${mesInicio}–${mesFim})`}>
          <TabelaComissoes series={projecao} />
        </Panel>
      </div>
    </div>
  );
}
