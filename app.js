function formatDate(d){
  // Retro simple: Thursday, Jan 8, 2026
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function setToday(){
  const el = document.querySelector("[data-today]");
  if(!el) return;
  el.textContent = formatDate(new Date());
}

function openNav(){
  document.querySelector(".sidenav")?.classList.add("open");
  document.querySelector(".sidenav-backdrop")?.classList.add("open");
}

function closeNav(){
  document.querySelector(".sidenav")?.classList.remove("open");
  document.querySelector(".sidenav-backdrop")?.classList.remove("open");
}

function wireNav(){
  const menuBtn = document.querySelector("[data-menu-btn]");
  const backdrop = document.querySelector(".sidenav-backdrop");
  const closeBtn = document.querySelector("[data-close-nav]");

  menuBtn?.addEventListener("click", openNav);
  backdrop?.addEventListener("click", closeNav);
  closeBtn?.addEventListener("click", closeNav);

  // ESC closes
  window.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closeNav();
  });
}

function wireRightButtons(){
  const go = (path) => () => { window.location.href = path; };

  document.querySelector("[data-archive-btn]")?.addEventListener("click", go("archive.html"));
  document.querySelector("[data-streak-btn]")?.addEventListener("click", go("streak.html"));
  document.querySelector("[data-notifs-btn]")?.addEventListener("click", go("notifications.html"));
  document.querySelector("[data-profile-btn]")?.addEventListener("click", go("profile.html"));
}

// Dummy compile/submit for challenge pages (no backend)
function wireChallengeButtons(){
  const compileBtn = document.querySelector("[data-compile]");
  const submitBtn = document.querySelector("[data-submit]");
  const output = document.querySelector("[data-output]");

  if(!compileBtn || !submitBtn || !output) return;

  compileBtn.addEventListener("click", ()=>{
    output.textContent =
`[compile]
This is a frontend-only mock.

In the real app, this would run Python in a sandbox and show stdout/stderr.`;
  });

  submitBtn.addEventListener("click", ()=>{
    output.textContent =
`[submit]
Also a mock.

In the real app, this would run hidden tests and return pass/fail + feedback.`;
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  setToday();
  wireNav();
  wireRightButtons();
  wireChallengeButtons();
});
