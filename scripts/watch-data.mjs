/**
 * Watcher dev-only: re-gera os JSON do dashboard quando as planilhas mudam.
 *
 * Observa as pastas de origem (xlsx) fora do projeto e, ao detectar uma
 * alteração, executa `scripts/transform_dre.py`, que grava:
 *   - src/data/dashboard.json
 *   - src/data/dre-details.json
 *
 * A UI atualiza sozinha via Vite HMR (os JSON são importados estaticamente).
 *
 * Uso:
 *   npm run watch:data   # watcher contínuo (roda uma vez e depois observa)
 *   npm run update:data  # equivalente a --once: regenera e sai
 *
 * Observações de robustez:
 *  - Excel salva em pulsos / via arquivo temporário + rename -> debounce +
 *    mutex evitam execuções sobrepostas e repetidas.
 *  - Arquivos de lock do Excel (~$...) são ignorados.
 *  - Sem novas dependências: usa apenas módulos nativos do Node.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.resolve(__dirname, "..");
const PARENT_DIR = path.resolve(PROJECT_DIR, "..");

// Mesma convenção de caminhos do transform_dre.py (relativo ao projeto).
const WATCH_DIRS = [
  path.join(PARENT_DIR, "loja_18314_MOEMA_FIN", "relatorios_focco"),
  path.join(PARENT_DIR, "loja_18314_MOEMA", "relatorios_carteira_mensal"),
  path.join(PARENT_DIR, "loja_18314_MOEMA_CONTRATOS", "relatorios_focco"),
];

const PYTHON_SCRIPT = path.join(PROJECT_DIR, "scripts", "transform_dre.py");
const DEBOUNCE_MS = 800;
const isWindows = process.platform === "win32";

function ts() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}
function log(...args) {
  console.log(`[watch-data ${ts()}]`, ...args);
}

/**
 * Encontra o interpretador Python disponível. Tenta `python` e depois `py`
 * (launcher do Windows). Retorna o nome do comando ou null se não achar.
 */
function resolvePythonCommand() {
  const candidates = isWindows ? ["python", "py"] : ["python3", "python"];
  for (const cmd of candidates) {
    const { status } = spawnSync(cmd, ["-V"], { stdio: "ignore", shell: isWindows });
    if (status === 0) return cmd;
  }
  return null;
}

let running = false;
let scheduled = false;
let timer = null;

/** Executa o transformador Python uma vez. */
function runTransform(reason) {
  if (running) {
    // Já está rodando: remarca para rodar de novo ao terminar (cobre pulsos).
    scheduled = true;
    return;
  }
  const py = resolvePythonCommand();
  if (!py) {
    log("ERRO: interpretador Python não encontrado (tentei python/py).");
    log("      Instale o Python e certifique-se de que ele está no PATH.");
    if (reason) log(`      (disparado por: ${reason})`);
    return;
  }
  running = true;
  if (reason) log(`Atualizando dados (${reason})...`);
  else log("Atualizando dados...");
  const child = spawn(py, [PYTHON_SCRIPT], {
    cwd: PROJECT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d) => (stdout += d.toString()));
  child.stderr?.on("data", (d) => (stderr += d.toString()));
  child.on("error", (err) => {
    running = false;
    log(`ERRO ao iniciar o Python: ${err.message}`);
    rescheduleMaybe();
  });
  child.on("close", (code) => {
    running = false;
    const took = code === 0 ? "OK" : `falha (exit ${code})`;
    log(`transform_dre.py finalizado — ${took}.`);
    if (stdout.trim()) process.stdout.write(indent(stdout.trim()) + "\n");
    if (stderr.trim()) process.stderr.write(indent(stderr.trim()) + "\n");
    rescheduleMaybe();
  });
}

function rescheduleMaybe() {
  if (scheduled) {
    scheduled = false;
    // pequeno atraso para agrupar múltiplos pulsos pós-execução
    setTimeout(() => runTransform("re-run"), DEBOUNCE_MS);
  }
}

function indent(text) {
  return text
    .split(/\r?\n/)
    .map((l) => `    ${l}`)
    .join("\n");
}

/** Agenda uma execução com debounce. */
function schedule(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => runTransform(reason), DEBOUNCE_MS);
}

/** Filtra eventos relevantes: só .xlsx, ignora lock do Excel (~$). */
function isRelevant(filename) {
  if (!filename) return false;
  const base = path.basename(filename);
  if (base.startsWith("~$")) return false; // lock / temp do Excel
  return base.toLowerCase().endsWith(".xlsx");
}

/** Observa um diretório recursivamente (suportado no Windows/Node 22). */
function watchDir(dir) {
  if (!fs.existsSync(dir)) {
    log(`Aviso: pasta não encontrada, ignorando: ${dir}`);
    return;
  }
  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!isRelevant(filename)) return;
      schedule(`"${path.basename(filename)}" ${eventType}`);
    });
    log(`Observando: ${dir}`);
  } catch (err) {
    log(`ERRO ao observar ${dir}: ${err.message}`);
  }
}

function main() {
  const once = process.argv.includes("--once");
  log(`Projeto: ${PROJECT_DIR}`);
  log(`Script:  ${PYTHON_SCRIPT}`);

  if (once) {
    log("Modo --once: regenerando uma vez e saindo...");
    const py = resolvePythonCommand();
    if (!py) {
      log("ERRO: interpretador Python não encontrado (tentei python/py).");
      process.exit(1);
    }
    const child = spawn(py, [PYTHON_SCRIPT], {
      cwd: PROJECT_DIR,
      stdio: "inherit",
      shell: false,
    });
    child.on("close", (code) => process.exit(code ?? 0));
    return;
  }

  // Watcher contínuo: roda uma vez no início e depois observa.
  runTransform("início");
  for (const dir of WATCH_DIRS) watchDir(dir);
  log(`Debounce: ${DEBOUNCE_MS}ms. Ctrl+C para parar.`);
}

main();
