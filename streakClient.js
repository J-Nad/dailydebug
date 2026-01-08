import { supabase } from "./supabaseClient.js";

async function loadStreak() {
  const status = document.querySelector("[data-streak-status]");
  const out = document.querySelector("[data-streak-out]");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    status.textContent = "Not signed in. Go to Profile to sign in.";
    out.textContent = "";
    return;
  }

  status.textContent = `Signed in as ${session.user.email}`;

  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("streak_current, streak_best, last_solve_date, gems, plan")
    .eq("user_id", session.user.id)
    .single();

  if (error) {
    out.textContent = `Error: ${error.message}`;
    return;
  }

  out.textContent =
`plan: ${stats.plan}
gems: ${stats.gems}
streak_current: ${stats.streak_current}
streak_best: ${stats.streak_best}
last_solve_date: ${stats.last_solve_date ?? "(none)"}`;
}

document.addEventListener("DOMContentLoaded", () => loadStreak());
