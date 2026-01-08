import { supabase } from "./supabaseClient.js";

async function refreshUI() {
  const { data: { session } } = await supabase.auth.getSession();
  const authed = !!session?.user;

  const status = document.querySelector("[data-auth-status]");
  const box = document.querySelector("[data-auth-box]");
  const panel = document.querySelector("[data-user-panel]");

  if (!status || !box || !panel) return;

  if (!authed) {
    status.textContent = "Not signed in.";
    box.style.display = "";
    panel.style.display = "none";
    return;
  }

  status.textContent = `Signed in as ${session.user.email}`;
  box.style.display = "none";
  panel.style.display = "";

  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  const out = document.querySelector("[data-stats]");
  if (!out) return;

  if (error) {
    out.textContent = `Could not load stats: ${error.message}`;
    return;
  }

  out.textContent =
`plan: ${stats.plan}
gems: ${stats.gems}
streak_current: ${stats.streak_current}
streak_best: ${stats.streak_best}
last_solve_date: ${stats.last_solve_date ?? "(none)"}`;
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert(error.message);
  else alert("Signed up. If confirmation is enabled, check email.");
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
}

async function signOut() {
  await supabase.auth.signOut();
}

async function addGem() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return alert("Sign in first.");

  const { data: stats, error: e1 } = await supabase
    .from("user_stats")
    .select("gems")
    .eq("user_id", session.user.id)
    .single();

  if (e1) return alert(e1.message);

  const { error: e2 } = await supabase
    .from("user_stats")
    .update({ gems: (stats.gems ?? 0) + 1 })
    .eq("user_id", session.user.id);

  if (e2) return alert(e2.message);
  await refreshUI();
}

function wire() {
  const emailEl = document.querySelector("[data-email]");
  const passEl = document.querySelector("[data-pass]");

  document.querySelector("[data-signup]")?.addEventListener("click", () =>
    signUp(emailEl.value.trim(), passEl.value)
  );
  document.querySelector("[data-signin]")?.addEventListener("click", () =>
    signIn(emailEl.value.trim(), passEl.value)
  );
  document.querySelector("[data-signout]")?.addEventListener("click", signOut);
  document.querySelector("[data-add-gem]")?.addEventListener("click", addGem);

  supabase.auth.onAuthStateChange(() => refreshUI());
  refreshUI();
}

wire();
