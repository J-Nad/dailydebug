import { supabase } from "./supabaseClient.js";

async function refreshMini() {
  const el = document.querySelector("[data-auth-mini]");
  const { data: { session } } = await supabase.auth.getSession();

  if (!el) return;
  el.textContent = session?.user
    ? `Signed in: ${session.user.email}`
    : "Not signed in.";
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) alert(error.message);
  await refreshMini();
  window.location.href = "./index.html";
}

document.querySelector("[data-logout-btn]")
  ?.addEventListener("click", logout);

supabase.auth.onAuthStateChange(refreshMini);
refreshMini();
