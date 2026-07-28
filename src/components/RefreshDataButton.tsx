import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshData } from "@/lib/refresh-data";

/**
 * Botão que regenera os JSON do dashboard a partir das planilhas .xlsx,
 * chamando a server function `refreshData` (executa o Python no servidor).
 *
 * Após atualizar com sucesso, recarrega a página para o Vite reler os JSONs
 * importados estaticamente.
 *
 * Em produção (sem planilhas/Python) aparece desabilitado.
 */
export function RefreshDataButton() {
  const [loading, setLoading] = useState(false);
  const isProd = import.meta.env.PROD;

  async function handleClick() {
    if (loading || isProd) return;
    setLoading(true);
    const tid = toast.loading("Atualizando dados das planilhas...");
    try {
      const res = await refreshData();
      if (res.ok) {
        toast.success(res.message, { id: tid, description: "Recarregando a página..." });
        // Pequeno atraso para o toast ser visível antes do reload.
        setTimeout(() => window.location.reload(), 700);
      } else {
        toast.error(res.message, { id: tid });
      }
    } catch (err) {
      toast.error("Erro inesperado ao atualizar.", {
        id: tid,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || isProd}
      title={
        isProd
          ? "Atualização disponível apenas em desenvolvimento local"
          : "Ler as planilhas .xlsx e regenerar os dados do dashboard"
      }
      className="w-full justify-start"
    >
      <RefreshCw className={loading ? "animate-spin" : undefined} />
      {loading ? "Atualizando..." : "Atualizar dados"}
    </Button>
  );
}
