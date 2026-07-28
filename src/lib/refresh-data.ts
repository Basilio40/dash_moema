/**
 * Server function: regenera os JSON do dashboard a partir das planilhas .xlsx.
 *
 * Executa no servidor (Nitro) — nunca no browser. Roda `scripts/transform_dre.py`,
 * que lê as planilhas de origem e grava `src/data/dashboard.json` e
 * `src/data/dre-details.json`.
 *
 * ⚠️ Somente faz sentido em desenvolvimento local, onde as planilhas `.xlsx`
 * e o interpretador Python existem. Em produção (Railway) as pastas de origem
 * não existem e o Python não está instalado — a UI desabilita o botão nesses
 * casos, mas esta função também se defende retornando um erro amigável.
 */
import { createServerFn } from "@tanstack/react-start";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Em runtime, __dirname aponta para dentro de .output/ ou do bundle de dev;
// resolvemos a raiz do projeto a partir do local esperado do código-fonte.
const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const PYTHON_SCRIPT = path.join(PROJECT_DIR, "scripts", "transform_dre.py");
const PARENT_DIR = path.resolve(PROJECT_DIR, "..");

const isWindows = process.platform === "win32";

/** Pastas de origem das planilhas — mesmas do transform_dre.py. */
const SOURCE_DIRS = [
  path.join(PARENT_DIR, "loja_18314_MOEMA_FIN", "relatorios_focco"),
  path.join(PARENT_DIR, "loja_18314_MOEMA", "relatorios_carteira_mensal"),
];

export type RefreshResult = {
  ok: boolean;
  message: string;
};

/**
 * Encontra o interpretador Python disponível (python, depois py no Windows).
 * Retorna o nome do comando ou null se não achar.
 */
function resolvePythonCommand(): string | null {
  const candidates = isWindows ? ["python", "py"] : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const { status } = spawnSync(cmd, ["-V"], { stdio: "ignore", shell: isWindows });
      if (status === 0) return cmd;
    } catch {
      // tenta próximo candidato
    }
  }
  return null;
}

export const refreshData = createServerFn({ method: "POST" }).handler(
  async (): Promise<RefreshResult> => {
    // Defesa em produção: sem Python nem planilhas, não há o que atualizar.
    if (import.meta.env.PROD) {
      return {
        ok: false,
        message: "Atualização só está disponível em ambiente de desenvolvimento.",
      };
    }

    const py = resolvePythonCommand();
    if (!py) {
      return {
        ok: false,
        message: "Python não encontrado. Instale o Python e certifique-se de que está no PATH.",
      };
    }

    if (!fs.existsSync(PYTHON_SCRIPT)) {
      return { ok: false, message: `Script não encontrado: ${PYTHON_SCRIPT}` };
    }

    const missingDirs = SOURCE_DIRS.filter((d) => !fs.existsSync(d));
    if (missingDirs.length > 0) {
      return {
        ok: false,
        message: `Pasta(s) de planilhas não encontrada(s): ${missingDirs.join(", ")}`,
      };
    }

    const result = spawnSync(py, [PYTHON_SCRIPT], {
      cwd: PROJECT_DIR,
      encoding: "utf8",
      shell: false,
      timeout: 120_000, // 2 min — segurança contra travamento
    });

    if (result.error) {
      return { ok: false, message: `Erro ao executar o Python: ${result.error.message}` };
    }

    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "").trim().split("\n").slice(-4).join(" ");
      return {
        ok: false,
        message: `Falha ao gerar os dados${detail ? `: ${detail}` : ""}.`,
      };
    }

    return { ok: true, message: "Dados atualizados com sucesso." };
  },
);
