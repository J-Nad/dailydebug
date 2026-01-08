import { supabase } from "./supabaseClient.js";

function fmtTime(iso){
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

async function loadNotifs(){
  const list = document.querySelector("[data-notif-list]");
  if (!list) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user){
    list.textContent = "Sign in to see notifications.";
    return;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,message,created_at,read")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error){
    list.textContent = `Could not load: ${error.message}`;
    return;
  }

  if (!data?.length){
    list.textContent = "(none)";
    return;
  }

  list.innerHTML = data.map(n => `
    <div class="notif-item">
      <div>${n.message}</div>
      <div class="notif-meta">${n.type} • ${fmtTime(n.created_at)}</div>
    </div>
  `).join("");
}

function togglePopover(){
  const pop = document.querySelector("[data-notif-pop]");
  if (!pop) return;
  pop.classList.toggle("open");
  if (pop.classList.contains("open")) loadNotifs();
}

function wireBell(){
  document.querySelector("[data-notifs-btn]")?.addEventListener("click", togglePopover);

  // close if click outside
  document.addEventListener("click", (e)=>{
    const pop = document.querySelector("[data-notif-pop]");
    const bell = document.querySelector("[data-notifs-btn]");
    if (!pop || !bell) return;
    if (!pop.classList.contains("open")) return;
    if (pop.contains(e.target) || bell.contains(e.target)) return;
    pop.classList.remove("open");
  });
}

async function subscribeRealtime(){
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  supabase
    .channel("notif-inserts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
      () => {
        // If popover open, refresh list
        const pop = document.querySelector("[data-notif-pop]");
        if (pop?.classList.contains("open")) loadNotifs();
      }
    )
    .subscribe();
}

wireBell();
subscribeRealtime();
