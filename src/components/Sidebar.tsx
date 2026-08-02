import { Link } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Layers, Users, Truck } from "lucide-react";
import { RefreshDataButton } from "./RefreshDataButton";

const items = [
  { to: "/", label: "Visão Geral", icon: BarChart3 },
  { to: "/dre", label: "DRE Mensal", icon: BarChart3 },
  { to: "/fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/centros-custo", label: "Centros de Custo", icon: Layers },
  { to: "/carteira", label: "Carteira de Clientes", icon: Users },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-panel/60 backdrop-blur">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/favicon.ico"
            alt="Italinea Decora"
            className="h-10 w-10 rounded-md object-contain"
          />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Italinea Decora
            </div>
            <div className="display text-lg font-bold text-foreground mt-1">Painel 2026</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-panel-elevated hover:text-foreground transition-colors"
            activeProps={{ className: "bg-panel-elevated text-primary kpi-glow" }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border space-y-3">
        <RefreshDataButton />
        <div className="text-[10px] text-muted-foreground">Dados: Jan–Jul / 2026</div>
      </div>
    </aside>
  );
}
