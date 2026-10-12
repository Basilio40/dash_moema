import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshData } from "@/lib/refresh-data";
import { limparCacheDados } from "@/lib/dados-remotos";

/**
 * Botão "Atualizar dados".
 *
 * Em desenvolvimento: regenera os JSON a partir das planilhas .xlsx
 * (server function que roda o Python local) e recarrega a página.
 *
 * Em produção: limpa o cache do carregador remoto (dados-remotos.ts) e
 * recarrega — os dados vêm do repo arquivos_ita, atualizado diariamente
 * pelo atualizar_dados_italinea.bat (08:00).
 */
export function RefreshDataButton() {
  const [loading, setLoading] = useState(false);
  const isProd = import.meta.env.PROD;

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const tid = toast.loading(
      isProd ? "Buscando os dados mais recentes..." : "Atualizando dados das planilhas...",
    );
    try {
      if (isProd) {
        await limparCacheDados();
        toast.success("Cache limpo. Recarregando a página...", {
          id: tid,
          description: "Os dados virão do repo arquivos_ita.",
        });
        setTimeout(() => window.location.reload(), 700);
        return;
      }

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
      disabled={loading}
      title={
        isProd
          ? "Descartar o cache e buscar os dados mais recentes do repo arquivos_ita"
          : "Ler as planilhas .xlsx e regenerar os dados do dashboard"
      }
      className="w-full justify-start"
    >
      <RefreshCw className={loading ? "animate-spin" : undefined} />
      {loading ? "Atualizando..." : "Atualizar dados"}
    </Button>
  );
}
