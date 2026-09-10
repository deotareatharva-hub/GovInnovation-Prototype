/* =========================================================
   GovInnovate — ui.js
   Reusable UI primitives used across all dashboard views.
   ========================================================= */

/* ---------------- Toasts ---------------- */
function toast(message, type=""){
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = `toast ${type}`.trim();
  el.textContent = message;
  host.appendChild(el);
  setTimeout(()=>{
    el.style.transition = "opacity .25s ease";
    el.style.opacity = "0";
    setTimeout(()=>el.remove(), 250);
  }, 3600);
}

/* ---------------- Modal ---------------- */
function openModal({title, bodyHtml, footHtml="", size=""}){
  closeModal();
  const root = document.getElementById("modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "activeModalBackdrop";
  backdrop.innerHTML = `
    <div class="modal ${size==='lg'?'modal-lg':''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ""}
    </div>`;
  backdrop.addEventListener("click", (e)=>{ if(e.target === backdrop) closeModal(); });
  root.appendChild(backdrop);
}
function closeModal(){
  const el = document.getElementById("activeModalBackdrop");
  if(el) el.remove();
}

/* ---------------- Drawer ---------------- */
function openDrawer({title, bodyHtml, subtitle=""}){
  closeDrawer();
  const root = document.getElementById("modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.id = "activeDrawerBackdrop";
  backdrop.addEventListener("click", (e)=>{ if(e.target === backdrop) closeDrawer(); });

  const drawer = document.createElement("div");
  drawer.className = "drawer";
  drawer.id = "activeDrawer";
  drawer.innerHTML = `
    <div class="drawer-head">
      <div>
        <h3 style="font-size:17px;color:var(--navy-900);">${title}</h3>
        ${subtitle ? `<p class="muted" style="font-size:12.5px;margin-top:4px;">${subtitle}</p>` : ""}
      </div>
      <button class="icon-btn" data-action="close-drawer" aria-label="Close">✕</button>
    </div>
    <div class="drawer-body">${bodyHtml}</div>`;
  root.appendChild(backdrop);
  root.appendChild(drawer);
}
function closeDrawer(){
  const b = document.getElementById("activeDrawerBackdrop");
  const d = document.getElementById("activeDrawer");
  if(b) b.remove();
  if(d) d.remove();
}

/* ---------------- Confirm dialog ---------------- */
function confirmDialog({title, message, confirmLabel="Confirm", danger=false, onConfirm}){
  openModal({
    title,
    bodyHtml: `<p style="font-size:14px;color:var(--text-muted);line-height:1.6;">${message}</p>`,
    footHtml: `
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn ${danger?'btn-danger':'btn-primary'}" id="confirmDialogBtn">${confirmLabel}</button>`
  });
  document.getElementById("confirmDialogBtn").addEventListener("click", ()=>{
    closeModal();
    onConfirm();
  });
}

/* ---------------- Stat grid ---------------- */
function statCard(label, value, accentVar="--teal-600", foot=""){
  return `
    <div class="stat-card" style="--stat-accent:var(${accentVar})">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
      ${foot ? `<div class="stat-foot">${foot}</div>` : ""}
    </div>`;
}

/* ---------------- Badges ---------------- */
function statusBadge(status){
  const map = {
    "Open":"badge-teal","Shortlisted":"badge-navy","Piloting":"badge-warning","Closed":"badge-neutral",
    "done":"badge-success","active":"badge-warning","locked":"badge-neutral",
    "Approved":"badge-success","Submitted":"badge-warning","Pending":"badge-neutral","Rejected":"badge-danger","Locked":"badge-neutral",
    "Released":"badge-success","verified":"badge-success","unverified":"badge-neutral",
    "LOW":"badge-success","MEDIUM":"badge-warning","HIGH":"badge-danger","CRITICAL":"badge-danger",
    "Applied":"badge-teal"
  };
  const cls = map[status] || "badge-neutral";
  return `<span class="badge ${cls}">${status}</span>`;
}

/* ---------------- Pilot stepper ---------------- */
function renderStepper(pilot){
  return `<div class="stepper">
    ${pilot.stages.map(s=>{
      const symbol = s.status==="done" ? "✓" : s.status==="active" ? "●" : "○";
      const stateLabel = s.status==="done" ? "Completed" : s.status==="active" ? "In Progress" : "Locked";
      return `<div class="step ${s.status}">
        <div class="step-connector"></div>
        <div class="dot">${symbol}</div>
        <div class="step-label">${s.name}</div>
        <div class="step-state">${stateLabel}</div>
      </div>`;
    }).join("")}
  </div>`;
}

/* ---------------- Match score ring (conic gradient) ---------------- */
function scoreRing(score){
  const color = score>=80 ? "var(--success-600)" : score>=55 ? "var(--teal-600)" : "var(--warning-600)";
  return `<div class="score-ring" style="background:conic-gradient(${color} ${score*3.6}deg, #E7ECF2 0deg);">
    <div style="width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;">
      <span>${score}%</span>
    </div>
  </div>`;
}

/* ---------------- Risk meter ---------------- */
function riskMeter(score){
  return `<div class="risk-meter"><div class="risk-meter-marker" style="left:${score}%;"></div></div>`;
}

/* ---------------- Charts ---------------- */
const chartRegistry = {};
function renderChart(canvasId, config){
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  if(typeof Chart === "undefined"){
    // Chart.js CDN unavailable (e.g. no internet at venue) — degrade gracefully.
    ctx.replaceWith(Object.assign(document.createElement("div"), {
      className:"empty-state", innerHTML:`<p class="empty-sub">Chart library unavailable offline.</p>`
    }));
    return;
  }
  if(chartRegistry[canvasId]) chartRegistry[canvasId].destroy();
  chartRegistry[canvasId] = new Chart(ctx, config);
}
const CHART_COLORS = ["#0E7C8C","#0A1E3D","#1E7A46","#9A6B00","#B23A2E","#5B6B82"];

/* ---------------- Empty state ---------------- */
function emptyState(title, sub=""){
  return `<div class="empty-state"><p class="empty-title">${title}</p>${sub?`<p class="empty-sub">${sub}</p>`:""}</div>`;
}

/* ---------------- Table builder ---------------- */
function buildTable(headers, rowsHtml){
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rowsHtml || `<tr><td colspan="${headers.length}">${emptyState("No records yet")}</td></tr>`}</tbody>
  </table></div>`;
}

/* ---------------- Global search ---------------- */
function runGlobalSearch(term){
  term = term.trim().toLowerCase();
  if(!term) return [];
  const results = [];
  DB.startups.forEach(s=>{
    if(s.name.toLowerCase().includes(term) || s.technologies.join(" ").toLowerCase().includes(term)){
      results.push({type:"Startup", label:s.name, sub:s.dpiitNumber, action:()=>openStartupProfile(s.id)});
    }
  });
  DB.challenges.forEach(c=>{
    if(c.title.toLowerCase().includes(term) || c.department.toLowerCase().includes(term)){
      results.push({type:"Challenge", label:c.title, sub:c.department, action:()=>{navigateTo(defaultViewForRole()); setTimeout(()=>openChallengeDetail(c.id),50);}});
    }
  });
  DB.pilots.forEach(p=>{
    if(p.id.toLowerCase().includes(term) || p.title.toLowerCase().includes(term)){
      results.push({type:"Pilot", label:p.title, sub:p.id, action:()=>openPilotDetail(p.id)});
    }
  });
  DB.departments.forEach(d=>{
    if(d.name.toLowerCase().includes(term)){
      results.push({type:"Department", label:d.name, sub:"Government Department", action:()=>{}});
    }
  });
  return results.slice(0,8);
}
