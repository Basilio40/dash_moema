/**
 * Server functions que buscam os JSONs do dashboard no repositório de dados
 * (github.com/Basilio40/arquivos_ita, branch main, pasta app/) em runtime.
 *
 * Por que server functions (createServerFn) e não fetch direto no loader:
 * o loader de rota também executa no browser em navegações client-side —
 * o token de leitura (DADOS_TOKEN) jamais pode ir para o bundle cliente.
 * Server functions executam só no servidor (Nitro), como o refresh-data.ts.
 *
 * Degradação suave: qualquer falha (rede, rate limit, JSON inválido) devolve
 * o JSON estático embutido no build (src/data/*.json) — o dashboard nunca
 * fica em branco, só mostra o dado do último commit do app.
 *
 * Variáveis de ambiente (Railway → Service → Variables):
 *  - DADOS_TOKEN   → PAT fine-grained com "Contents: Read-only" APENAS para o
 *                    repo arquivos_ita (necessário só enquanto ele é privado).
 *  - DADOS_RAW_BASE → override da URL base (raro; default abaixo).
 */
import { createServerFn } from "@tanstack/react-start";
import dashboardFallback from "@/data/dashboard.json";
import dreDetailsFallback from "@/data/dre-details.json";
import comissoesFallback from "@/data/comissoes.json";
import projecaoContratosFallback from "@/data/projecao-contratos.json";
import realizadoFluxoFallback from "@/data/fluxo-caixa-realizado.json";
import previsaoFluxoFallback from "@/data/fluxo-caixa-previsao.json";

const RAW_BASE =
  process.env.DADOS_RAW_BASE ??
  "https://raw.githubusercontent.com/Basilio40/arquivos_ita/main/app";

/** Tipo do dashboard.json — o fallback estático é a fonte da verdade da forma. */
export type Dashboard = typeof dashboardFallback;

const TOKEN = process.env.DADOS_TOKEN ?? "";

/** Cache em memória por arquivo: valor + ETag + validade. */
type EntradaCache = { valor: unknown; etag?: string; expira: number };
const cache = new Map<string, EntradaCache>();

const TTL_MS = 5 * 60_000; // 5 minutos
const FETCH_TIMEOUT_MS = 5_000;

function logErro(contexto: string, detalhe: unknown) {
  // Log simples com prefixo — suficiente para o escopo (ver logs da Railway).
  console.warn(`[dados-remotos] ${contexto}:`, detalhe);
}

/**
 * Busca um JSON do repo de dados com cache+ETag; devolve o fallback estático
 * se qualquer coisa falhar ou o conteúdo não passar na validação mínima.
 */
async function buscarJson<T>(
  nome: string,
  fallback: T,
  valido: (valor: unknown) => boolean,
): Promise<T> {
  // Em dev os JSONs locais acabaram de ser regenerados pelo refresh-data
  // (Python + planilhas) — buscar no GitHub só adicionaria dado defasado.
  if (import.meta.env.DEV) return fallback;

  const agora = Date.now();
  const emCache = cache.get(nome);
  if (emCache && emCache.expira > agora) {
    return emCache.valor as T;
  }

  try {
    const resposta = await fetch(`${RAW_BASE}/${nome}`, {
      headers: {
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        ...(emCache?.etag ? { "If-None-Match": emCache.etag } : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (resposta.status === 304 && emCache) {
      cache.set(nome, { ...emCache, expira: agora + TTL_MS });
      return emCache.valor as T;
    }
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} (${resposta.statusText})`);
    }

    const valor = await resposta.json();
    if (!valido(valor)) {
      throw new Error("conteúdo não passou na validação de forma (shape)");
    }

    cache.set(nome, {
      valor,
      etag: resposta.headers.get("etag") ?? undefined,
      expira: agora + TTL_MS,
    });
    return valor as T;
  } catch (erro) {
    logErro(`falha ao buscar ${nome}; usando JSON estático do build`, erro);
    return fallback;
  }
}

// --- validações mínimas de shape: barram JSON vazio/corrompido sem quebrar ---

const ehObjeto = (v: unknown) => typeof v === "object" && v !== null;

const dashboardValido = (v: unknown) => ehObjeto(v) && "dreMonth" in v && "dreGroups" in v;
const listaValida = (v: unknown) => Array.isArray(v) && v.length > 0;

// --- server functions (uma por JSON; loaders compostos chamam as que precisam) ---

export const carregarDashboard = createServerFn({ method: "GET" }).handler(
  async () => buscarJson("dashboard.json", dashboardFallback, dashboardValido),
);

export const carregarDreDetails = createServerFn({ method: "GET" }).handler(
  async () => buscarJson("dre-details.json", dreDetailsFallback, listaValida),
);

export const carregarComissoes = createServerFn({ method: "GET" }).handler(
  async () => buscarJson("comissoes.json", comissoesFallback, listaValida),
);

export const carregarFluxoCaixa = createServerFn({ method: "GET" }).handler(
  async () => {
    const [projecao, realizado, previsao] = await Promise.all([
      buscarJson("projecao-contratos.json", projecaoContratosFallback, listaValida),
      buscarJson("fluxo-caixa-realizado.json", realizadoFluxoFallback, listaValida),
      buscarJson("fluxo-caixa-previsao.json", previsaoFluxoFallback, listaValida),
    ]);
    return { projecao, realizado, previsao };
  },
);

/** Limpa o cache (usado pelo botão Atualizar em produção). */
export const limparCacheDados = createServerFn({ method: "POST" }).handler(
  async () => {
    cache.clear();
    return { ok: true };
  },
);
