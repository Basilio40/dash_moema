import { useState, Fragment } from "react";
import data from "@/data/dashboard.json";
import { Panel } from "@/components/PageHeader";
import { brl, brlCompact } from "@/lib/format";
import { DarkTooltip } from "@/components/ChartTooltip";
import { colunasMes, valorMes } from "@/components/PeriodFilter";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type NumRec = Record<string, number>;

type ClienteRec = { cliente: string; primeiroMes: string } & NumRec;

export function DrillDownClientes({ mes }: { mes: string }) {
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
