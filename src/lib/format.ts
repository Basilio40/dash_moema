export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export const brlCompact = (n: number) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return brl(n);
};

export const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

export const CHART_COLORS = ["#22D3EE", "#10B981", "#F59E0B", "#A78BFA", "#F472B6", "#60A5FA", "#FB923C", "#34D399", "#818CF8"];
