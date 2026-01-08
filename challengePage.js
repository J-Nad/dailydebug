import { supabase } from "./supabaseClient.js";

// America/Chicago "today" string: YYYY-MM-DD
export function chicagoTodayYYYYMMDD() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA outputs YYYY-MM-DD
}

let pyodidePromise = null;

async function loadPyodideOnce() {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    // Load pyodide script (global loadPyodide)
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
    s.async = true;
    document.head.appendChild(s);

    await new Promise((resolve, reject) => {
      s.onload = resolve;
      s.onerror = reject;
    });

    // eslint-disable-next-line no-undef
    const pyodide = await loadPyodide();
    return pyodide;
  })();

  return pyodidePromise;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildCodeFromLines(lines, lineInputs) {
  return lines
    .map((ln, i) => (ln.locked ? ln.text : (lineInputs[i]?.value ?? "")))
    .join("\n");
}

function renderEditor(lines, editorEl) {
  // Table-like layout with line numbers
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "60px 1fr";
  wrap.style.gap = "0px";

  const lineInputs = [];

  lines.forEach((ln, idx) => {
    const lnNo = document.createElement("div");
    lnNo.style.fontFamily = "var(--mono)";
    lnNo.style.borderRight = "2px solid #000";
    lnNo.style.padding = "2px 8px";
    lnNo.textContent = String(idx + 1);

    const cell = document.createElement("div");
    cell.style.padding = "2px 8px";
    cell.style.fontFamily = "var(--mono)";
    cell.style.whiteSpace = "pre";

    if (ln.locked) {
      cell.className = "locked";
      cell.innerHTML = escapeHtml(ln.text || "");
      lineInputs[idx] = null;
    } else {
      cell.className = "unlocked";
      const input = document.createElement("input");
      input.type = "text";
      input.value = ln.text ?? "";
      input.style.width = "100%";
      input.style.border = "0";
      input.style.outline = "none";
      input.style.fontFamily = "var(--mono)";
      input.style.fontSize = "13px";
      input.style.background = "transparent";
      input.spellcheck = false;

      cell.appendChild(input);
      lineInputs[idx] = input;
    }

    wrap.appendChild(lnNo);
    wrap.appendChild(cell);
  });

  editorEl.innerHTML = "";
  editorEl.appendChild(wrap);
  return lineInputs;
}

async function runPython(pyodide, code) {
  // Capture stdout/stderr-like output
  const wrapped = `
import sys, io, traceback
_stdout = io.StringIO()
sys.stdout = _stdout
try:
    exec(compile(${JSON.stringify(code)}, "<dailydebug>", "exec"), {})
    _out = _stdout.getvalue()
except Exception:
    _out = _stdout.getvalue() + "\\n" + traceback.format_exc()
_out
`;
  const out = await pyodide.runPythonAsync(wrapped);
  return String(out ?? "");
}

export async function initChallengePage({ difficulty }) {
  const dateEl = document.querySelector("[data-today]");
  const descEl = document.querySelector("[data-desc]");
  const editorEl = document.querySelector("[data-editor]");
  const outputEl = document.querySelector("[data-output]");
  const compileBtn = document.querySelector("[data-compile]");
  const submitBtn = document.querySelector("[data-submit]");
  const titleEl = document.querySelector("[data-ch-title]");

  const today = chicagoTodayYYYYMMDD();

  if (dateEl) dateEl.textContent = today;
  if (titleEl) titleEl.textContent = `${difficulty.toUpperCase()} — ${today}`;

  // Load JSON
  const url = `./challenges/${today}/${difficulty}.json`;
  let problem;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Missing daily JSON: ${url}`);
    problem = await res.json();
  } catch (e) {
    if (descEl) descEl.textContent = `No problem found for today (${today}) at ${url}.`;
    if (outputEl) outputEl.textContent = String(e);
    if (compileBtn) compileBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (descEl) descEl.textContent = problem.description ?? "(no description)";
  const lines = problem.lines ?? [];
  const lineInputs = renderEditor(lines, editorEl);

  const pyodide = await loadPyodideOnce();

  compileBtn?.addEventListener("click", async () => {
    const code = buildCodeFromLines(lines, lineInputs);
    outputEl.textContent = "[running...]\n";
    const out = await runPython(pyodide, code);
    outputEl.textContent = out.trim() ? out : "(no output)";
  });

  submitBtn?.addEventListener("click", async () => {
    const code = buildCodeFromLines(lines, lineInputs);
    outputEl.textContent = "[submitting...]\n";

    // Run user code once + then tests
    const tests = problem.tests ?? [];
    const all = [code, ...tests.map(t => t.code)].join("\n\n");

    const out = await runPython(pyodide, all);

    // Convention: tests raise AssertionError on fail; traceback will appear.
    const passed = !out.includes("AssertionError") && !out.includes("Traceback");

    if (!passed) {
      outputEl.textContent = `FAILED\n\n${out}`;
      return;
    }

    // If passed, claim reward ONCE via secure RPC
    const gemsAward = Number(problem.gems ?? 1);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      outputEl.textContent = "Passed tests, but you are not signed in. Sign in on Profile to claim rewards.";
      return;
    }

    const { data, error } = await supabase.rpc("claim_daily_solve", {
      p_challenge_date: today,
      p_difficulty: difficulty,
      p_gems: gemsAward,
    });

    if (error) {
      outputEl.textContent = `PASSED tests, but could not claim reward:\n${error.message}`;
      return;
    }

    outputEl.textContent =
      `PASSED ✅\n\n${out.trim() ? out : "(no output)"}\n\n` +
      `Reward: ${JSON.stringify(data, null, 2)}`;
  });
}
