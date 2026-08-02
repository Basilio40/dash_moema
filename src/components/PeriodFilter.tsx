import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"];

export const MES_OPCOES = [
  { value: "all", label: "Todos os meses" },
  { value: "Jan", label: "Janeiro" },
  { value: "Fev", label: "Fevereiro" },
  { value: "Mar", label: "Março" },
  { value: "Abr", label: "Abril" },
  { value: "Mai", label: "Maio" },
  { value: "Jun", label: "Junho" },
  { value: "Jul", label: "Julho" },
];

export const ANO_OPCOES = [{ value: "2026", label: "2026" }];

type PeriodState = {
  mes: string;
  ano: string;
  setMes: (m: string) => void;
  setAno: (a: string) => void;
};

/** Hook que controla o estado do filtro de período (mês + ano). */
export function usePeriod(defaultMes = "all"): PeriodState {
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState("2026");
  return { mes, ano, setMes, setAno };
}

/** Filtra um array cujos registros possuem o campo `mes`. */
export function filterByMes<T extends { mes: string }>(arr: T[], mes: string): T[] {
  if (mes === "all") return arr;
  return arr.filter((x) => x.mes === mes);
}

/**
 * Soma o valor de um registro que possui colunas mensais (Jan..Jul) + `total`.
 * Quando um mês específico é selecionado retorna apenas a coluna daquele mês.
 */
export function valorMes(obj: Record<string, number>, mes: string): number {
  if (mes === "all") {
    return (
      obj.total ?? MESES_CURTOS.reduce((s, m) => s + (typeof obj[m] === "number" ? obj[m] : 0), 0)
    );
  }
  return typeof obj[mes] === "number" ? obj[mes] : 0;
}

/** Colunas de mês a exibir nas tabelas conforme o filtro selecionado. */
export function colunasMes(mes: string): string[] {
  if (mes === "all") return MESES_CURTOS;
  return [mes];
}

export function PeriodFilter({ value, onChange }: { value: PeriodState; onChange?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select
        value={value.mes}
        onValueChange={(v) => {
          value.setMes(v);
          onChange?.();
        }}
      >
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          {MES_OPCOES.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.ano}
        onValueChange={(v) => {
          value.setAno(v);
          onChange?.();
        }}
      >
        <SelectTrigger className="w-[90px] h-9">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {ANO_OPCOES.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
