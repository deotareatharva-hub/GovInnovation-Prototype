/* =========================================================
   GovInnovate — app.js
   Router, navigation, dashboard views, event wiring.
   ========================================================= */

let appState = { currentView:null, matcherText:"", matcherResults:null, matcherChallengeId:null };

function esc(str){
  return String(str==null?"":str).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function setMain(html){ document.getElementById("mainContent").innerHTML = html; }
function pageHeader(title, sub){
  return `<div class="page-title-wrap"><h1 class="page-title">${title}</h1>${sub?`<p class="page-sub">${sub}</p>`:""}</div>`;
}

/* ---------------------------------------------------------
   Navigation configuration per role
   --------------------------------------------------------- */
const NAV_CONFIG = {
  department:[
    {key:"gov-overview", label:"Overview", icon:"◧"},
    {key:"gov-challenges", label:"Challenges", icon:"▤"},
    {key:"gov-matcher", label:"Startup Matcher", icon:"✦"},
    {key:"gov-verified", label:"Verified Startups", icon:"✓"},
    {key:"gov-expert", label:"Expert Reviews", icon:"◈"},
    {key:"gov-pilots", label:"Pilot Tracker", icon:"⟳"},
    {key:"gov-milestones", label:"Milestones", icon:"◎"},
    {key:"gov-risk", label:"Risk Matrix", icon:"▲"},
    {key:"gov-feedback", label:"Public Feedback", icon:"★"},
    {key:"gov-decision", label:"Decision & Procurement", icon:"⚖"},
    {key:"gov-compliance", label:"Compliance", icon:"▣"},
    {key:"gov-payments", label:"Payments", icon:"₹"},
    {key:"gov-policy", label:"Policy Assistant", icon:"❓"},
    {key:"gov-audit", label:"Audit Log", icon:"≡"},
    {key:"gov-reports", label:"Reports", icon:"▦"},
    {key:"gov-settings", label:"Settings", icon:"⚙"}
  ],
  startup:[
    {key:"su-overview", label:"Overview", icon:"◧"},
    {key:"su-discover", label:"Discover Challenges", icon:"✦"},
    {key:"su-applications", label:"My Applications", icon:"▤"},
    {key:"su-expert", label:"Expert Review", icon:"◈"},
    {key:"su-pilots", label:"My Pilots", icon:"⟳"},
    {key:"su-milestones", label:"Milestones", icon:"◎"},
    {key:"su-payments", label:"Payments", icon:"₹"},
    {key:"su-documents", label:"Documents", icon:"▣"},
    {key:"su-profile", label:"Profile", icon:"◈"}
  ],
  admin:[
    {key:"ad-overview", label:"Overview", icon:"◧"},
    {key:"ad-startups", label:"Startups", icon:"◈"},
    {key:"ad-challenges", label:"Challenges", icon:"▤"},
    {key:"ad-experts", label:"Experts", icon:"◉"},
    {key:"ad-pilots", label:"Pilots", icon:"⟳"},
    {key:"ad-payments", label:"Payments", icon:"₹"},
    {key:"ad-risk", label:"Risk Alerts", icon:"▲"},
    {key:"ad-feedback", label:"Public Feedback", icon:"★"},
    {key:"ad-policy", label:"Policy Assistant", icon:"❓"},
    {key:"ad-reports", label:"Reports", icon:"▦"},
    {key:"ad-audit", label:"Audit Log", icon:"≡"},
    {key:"ad-settings", label:"Settings", icon:"⚙"}
  ],
  expert:[
    {key:"exp-overview", label:"Dashboard", icon:"◧"},
    {key:"exp-queue", label:"Review Queue", icon:"▤"},
    {key:"exp-audit", label:"Audit Log", icon:"≡"},
    {key:"exp-settings", label:"Settings", icon:"⚙"}
  ],
  public:[
    {key:"pub-dashboard", label:"Public Dashboard", icon:"◧"}
  ]
};
const DEFAULT_VIEW = {department:"gov-overview", startup:"su-overview", admin:"ad-overview", expert:"exp-overview", public:"pub-dashboard"};
function defaultViewForRole(){ return DEFAULT_VIEW[DB.currentUser.role]; }

const RENDERERS = {
  "gov-overview":renderGovOverview, "gov-challenges":renderGovChallenges, "gov-matcher":renderGovMatcher,
  "gov-verified":renderGovVerified, "gov-pilots":renderGovPilots, "gov-milestones":renderGovMilestones,
  "gov-risk":renderGovRisk, "gov-compliance":renderGovCompliance, "gov-payments":renderGovPayments,
  "gov-audit":renderAuditLogView, "gov-reports":renderGovReports, "gov-settings":renderSettingsView,
  "gov-feedback":renderGovFeedbackDashboard, "gov-decision":renderGovDecisionList, "gov-policy":renderPolicyAssistant,

  "su-overview":renderStartupOverview, "su-discover":renderStartupDiscover, "su-applications":renderStartupApplications,
  "su-pilots":renderStartupPilots, "su-milestones":renderStartupMilestones, "su-payments":renderStartupPayments,
  "su-documents":renderStartupDocuments, "su-profile":renderStartupProfile,

  "ad-overview":renderAdminOverview, "ad-startups":renderAdminStartups, "ad-challenges":renderAdminChallenges,
  "ad-experts":renderAdminExperts, "ad-pilots":renderAdminPilots, "ad-payments":renderAdminPayments, "ad-risk":renderAdminRisk,
  "ad-reports":renderAdminReports, "ad-audit":renderAuditLogView, "ad-settings":renderSettingsView,
  "ad-feedback":renderGovFeedbackDashboard, "ad-policy":renderPolicyAssistant,

  "exp-overview":renderExpertOverview, "exp-queue":renderExpertQueue, "exp-workspace":renderExpertEvaluationWorkspace,
  "exp-pilotval":renderExpertPilotValidation, "exp-audit":renderAuditLogView, "exp-settings":renderSettingsView,
  "gov-expert":renderGovExpertReviews, "su-expert":renderStartupExpertReview,

  "pub-dashboard":renderPublicDashboard
};

/* ---------------------------------------------------------
   Auth / boot
   --------------------------------------------------------- */
function login(role){
  const expert = DB.experts[0];
  const identities = {
    department:{name:"Priya Deshmukh", title:"Program Officer", dept:"Water Resources Department, Maharashtra"},
    startup:{name:"Rohan Mehta", title:"Founder", startupId:"ST001"},
    admin:{name:"Admin User", title:"Program Administrator"},
    expert:{name:expert.name, title:"Technical Expert / Verifier", domain:expert.domain, expertId:expert.id},
    public:{name:"Citizen User", title:"General User / Beneficiary"}
  };
  DB.currentUser = { role, ...identities[role] };
  persist();
  document.getElementById("view-landing").hidden = true;
  document.getElementById("view-login").hidden = true;
  document.getElementById("view-app").hidden = false;
  buildSidebar();
  renderUserChip();
  navigateTo(defaultViewForRole());
}
function logout(){
  DB.currentUser = null;
  persist();
  document.getElementById("view-app").hidden = true;
  document.getElementById("view-login").hidden = false;
  document.getElementById("view-landing").hidden = true;
}
function gotoLanding(){
  document.getElementById("view-app").hidden = true;
  document.getElementById("view-login").hidden = true;
  document.getElementById("view-landing").hidden = false;
}
function gotoLogin(){
  document.getElementById("view-landing").hidden = true;
  document.getElementById("view-app").hidden = true;
  document.getElementById("view-login").hidden = false;
}

function buildSidebar(){
  const items = NAV_CONFIG[DB.currentUser.role];
  document.getElementById("sidebarNav").innerHTML = items.map(it=>`
    <button class="nav-item" data-action="navigate" data-view="${it.key}" id="nav-${it.key}">
      <span class="nav-icon">${it.icon}</span>${it.label}
    </button>`).join("");
}
function renderUserChip(){
  const u = DB.currentUser;
  const initials = u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const roleLabel = {department:"Government", startup:"Startup", admin:"Administrator", expert:"Expert / Verifier", public:"General User"}[u.role] || u.role;
  document.getElementById("userChip").innerHTML = `<span class="avatar">${initials}</span><span>${esc(u.name)} · ${roleLabel}</span>`;
}

function navigateTo(viewKey){
  appState.currentView = viewKey;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  const btn = document.getElementById(`nav-${viewKey}`);
  if(btn) btn.classList.add("active");
  const fn = RENDERERS[viewKey];
  if(fn) fn();
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mainContent").scrollTop = 0;
  window.scrollTo({top:0, behavior:"instant"});
}

/* ---------------------------------------------------------
   ================= GOVERNMENT: OVERVIEW ==================
   --------------------------------------------------------- */
function renderGovOverview(){
  const activeChallenges = DB.challenges.filter(c=>c.status!=="Closed").length;
  const startupsShortlisted = new Set(DB.challenges.flatMap(c=>c.shortlist)).size;
  const activePilots = DB.pilots.length;
  const pendingApprovals = DB.milestones.filter(m=>m.status==="Submitted").length;
  const totalAllocation = DB.challenges.filter(c=>c.status==="Piloting").reduce((s,c)=>s+c.budget,0);
  const successfulPilots = DB.pilots.filter(p=>p.currentStage>=3).length;
  const scaleUpCandidates = DB.pilots.filter(p=>p.currentStage===4).length;

  setMain(`
    ${pageHeader("Overview", `${esc(DB.currentUser.dept)} — Innovation-to-Procurement Dashboard`)}
    <div class="section-block">
      <div class="stat-grid">
        ${statCard("Active Challenges", activeChallenges, "--teal-600")}
        ${statCard("Startups Shortlisted", startupsShortlisted, "--navy-800")}
        ${statCard("Active Pilots", activePilots, "--teal-600")}
        ${statCard("Pending Approvals", pendingApprovals, "--warning-600")}
      </div>
    </div>
    <div class="section-block">
      <div class="stat-grid">
        ${statCard("Total Pilot Allocation", formatINR(totalAllocation), "--navy-800")}
        ${statCard("Successful Pilots", successfulPilots, "--success-600")}
        ${statCard("Scale-Up Candidates", scaleUpCandidates, "--success-600")}
        ${statCard("Compliance Docs Generated", DB.documents.length, "--teal-600")}
      </div>
    </div>
    <div class="section-block grid-3">
      <div class="chart-card"><h4>Challenges by Status</h4><div class="chart-holder"><canvas id="chChallengeStatus"></canvas></div></div>
      <div class="chart-card"><h4>Pilot Lifecycle Distribution</h4><div class="chart-holder"><canvas id="chPilotLifecycle"></canvas></div></div>
      <div class="chart-card"><h4>Budget Utilization</h4><div class="chart-holder"><canvas id="chBudget"></canvas></div></div>
    </div>
  `);

  const statusCounts = {Open:0, Shortlisted:0, Piloting:0, Closed:0};
  DB.challenges.forEach(c=>statusCounts[c.status]++);
  renderChart("chChallengeStatus", {type:"doughnut", data:{labels:Object.keys(statusCounts), datasets:[{data:Object.values(statusCounts), backgroundColor:CHART_COLORS}]}, options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:11}}}}}});

  const stageCounts = PILOT_STAGE_NAMES.map(name=>DB.pilots.filter(p=>p.stages[p.currentStage].name===name).length);
  renderChart("chPilotLifecycle", {type:"bar", data:{labels:PILOT_STAGE_NAMES.map(n=>n.replace(" Procurement","")), datasets:[{data:stageCounts, backgroundColor:"#0E7C8C", borderRadius:4}]}, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{stepSize:1}}, x:{ticks:{font:{size:10}}}}}});

  const released = DB.milestones.filter(m=>m.paymentStatus==="Released").reduce((s,m)=>s+m.paymentAmount,0);
  const pending = DB.milestones.filter(m=>m.paymentStatus==="Pending").reduce((s,m)=>s+m.paymentAmount,0);
  const locked = DB.milestones.filter(m=>m.paymentStatus==="Locked").reduce((s,m)=>s+m.paymentAmount,0);
  renderChart("chBudget", {type:"bar", data:{labels:["Released","Pending","Locked"], datasets:[{data:[released,pending,locked], backgroundColor:["#1E7A46","#9A6B00","#8393A8"], borderRadius:4}]}, options:{indexAxis:"y", plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true, ticks:{callback:v=>"₹"+(v/1000)+"k"}}}}});
}

/* ---------------------------------------------------------
   ================= GOVERNMENT: CHALLENGES =================
   --------------------------------------------------------- */
function renderGovChallenges(){
  const rows = DB.challenges.map(c=>`
    <tr>
      <td><strong>${esc(c.title)}</strong><br><span class="faint" style="font-size:11.5px;">${esc(c.id)} · ${esc(c.domain)}</span></td>
      <td>${esc(c.department)}</td>
      <td>${formatINR(c.budget)}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${c.shortlist.length}</td>
      <td>${formatDate(c.deadline)}</td>
      <td class="table-actions">
        <button class="btn btn-ghost btn-sm" data-action="view-challenge" data-id="${c.id}">View</button>
        <button class="btn btn-secondary btn-sm" data-action="goto-matcher-for-challenge" data-id="${c.id}">Find Matches</button>
      </td>
    </tr>`).join("");

  setMain(`
    ${pageHeader("Challenges", "Publish problem statements and track their progress through the innovation pipeline.")}
    <div class="section-head"><h2>All Challenges</h2><button class="btn btn-primary" data-action="open-create-challenge">+ Create Challenge</button></div>
    ${buildTable(["Challenge","Department","Pilot Budget","Status","Shortlisted","Deadline","Actions"], rows)}
  `);
}

function openCreateChallengeModal(){
  openModal({
    title:"Create Challenge", size:"lg",
    bodyHtml:`
      <form id="createChallengeForm" novalidate>
        <div class="form-grid">
          <div class="form-field full" id="f-title"><label>Challenge Title <span class="req">*</span></label>
            <input type="text" name="title" placeholder="e.g. Algal Bloom Detection in Rural Lakes">
            <span class="field-error">Challenge title is required.</span></div>

          <div class="form-field" id="f-department"><label>Department <span class="req">*</span></label>
            <select name="department">${DB.departments.map(d=>`<option value="${esc(d.name)}">${esc(d.name)}</option>`).join("")}</select></div>

          <div class="form-field" id="f-domain"><label>Domain</label>
            <input type="text" name="domain" placeholder="e.g. Environmental Monitoring"></div>

          <div class="form-field full" id="f-description"><label>Problem Description <span class="req">*</span></label>
            <textarea name="description" placeholder="Describe the problem, context and desired capability…"></textarea>
            <span class="field-error">Problem description cannot be empty.</span></div>

          <div class="form-field" id="f-location"><label>Location</label>
            <input type="text" name="location" placeholder="e.g. Konkan Division, Maharashtra"></div>

          <div class="form-field" id="f-budget"><label>Pilot Budget (₹) <span class="req">*</span></label>
            <input type="number" name="budget" min="0" placeholder="650000">
            <span class="field-error">Enter a valid pilot budget.</span></div>

          <div class="form-field" id="f-duration"><label>Expected Pilot Duration</label>
            <input type="text" name="duration" placeholder="e.g. 16 weeks"></div>

          <div class="form-field" id="f-requiredTech"><label>Required Technology</label>
            <input type="text" name="requiredTech" placeholder="e.g. AI, IoT, Remote Sensing"></div>

          <div class="form-field full" id="f-validationCriteria"><label>Validation Criteria</label>
            <input type="text" name="validationCriteria" placeholder="e.g. ≥90% detection accuracy over 60 days"></div>

          <div class="form-field full" id="f-expectedOutcome"><label>Expected Outcome</label>
            <input type="text" name="expectedOutcome" placeholder="e.g. Deployable early-warning system"></div>

          <div class="form-field" id="f-deadline"><label>Submission Deadline</label>
            <input type="date" name="deadline"></div>
        </div>
      </form>`,
    footHtml:`<button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" id="submitChallengeBtn">Create Challenge</button>`
  });
  document.getElementById("submitChallengeBtn").addEventListener("click", submitCreateChallenge);
}

function submitCreateChallenge(){
  const form = document.getElementById("createChallengeForm");
  const data = Object.fromEntries(new FormData(form).entries());
  let valid = true;
  const setError = (id, cond)=>{
    document.getElementById(id).classList.toggle("error", cond);
    document.getElementById(id).querySelector(".field-error").classList.toggle("show", cond);
    if(cond) valid = false;
  };
  setError("f-title", !data.title.trim());
  setError("f-description", !data.description.trim());
  setError("f-budget", !data.budget || Number(data.budget) <= 0);
  if(!valid){ toast("Please fix the highlighted fields.", "error"); return; }

  const challenge = createChallenge(data);
  closeModal();
  toast(`Challenge "${challenge.title}" created.`, "success");
  renderGovChallenges();
}

/* ---------------------------------------------------------
   ============= GOVERNMENT: AI STARTUP MATCHER =============
   --------------------------------------------------------- */
function renderGovMatcher(prefillChallengeId){
  const openChallenges = DB.challenges.filter(c=>c.status!=="Closed");
  const preselect = prefillChallengeId || appState.matcherChallengeId || (openChallenges[0] && openChallenges[0].id) || "";
  const preChallenge = getChallenge(preselect);
  const text = appState.matcherText || (preChallenge ? preChallenge.description : "");

  setMain(`
    ${pageHeader("AI Startup Matcher", "Weighted keyword + technology-tag matching engine — a simplified stand-in for semantic search.")}
    <div class="card section-block">
      <div class="form-field" style="margin-bottom:12px;">
        <label>Target Challenge (for shortlisting)</label>
        <select id="matcherChallengeSelect">${openChallenges.map(c=>`<option value="${c.id}" ${c.id===preselect?"selected":""}>${esc(c.title)}</option>`).join("")}</select>
      </div>
      <div class="form-field">
        <label>Problem Description</label>
        <textarea id="matcherInput" placeholder="e.g. Algal bloom detection in rural lakes using low-cost sensors and AI.">${esc(text)}</textarea>
      </div>
      <div class="form-actions" style="justify-content:flex-start;margin-top:12px;">
        <button class="btn btn-primary" data-action="run-matcher">Find Matching Startups</button>
      </div>
    </div>
    <div id="matcherResultsHost" class="section-block"></div>
  `);

  if(appState.matcherResults){
    renderMatcherResults(appState.matcherResults);
  }
}

function runMatcherFromUI(){
  const text = document.getElementById("matcherInput").value.trim();
  appState.matcherChallengeId = document.getElementById("matcherChallengeSelect").value;
  if(!text){ toast("Enter a problem description first.", "error"); return; }
  appState.matcherText = text;
  const results = matchStartups(text);
  appState.matcherResults = results;
  renderMatcherResults(results);
  toast(`Found ${results.length} matching startup${results.length===1?"":"s"}.`, "success");
}

function renderMatcherResults(results){
  const host = document.getElementById("matcherResultsHost");
  if(!host) return;
  if(results.length === 0){
    host.innerHTML = emptyState("No matches found", "Try broadening the problem description with more technology keywords.");
    return;
  }
  host.innerHTML = `
    <div class="section-head"><h2>Matching Startups</h2><span class="muted">${results.length} result${results.length===1?"":"s"}, ranked by match score</span></div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${results.map((r,i)=>`
        <div class="match-card" data-action="view-startup-from-match" data-id="${r.startup.id}">
          <div class="match-rank">${String(i+1).padStart(2,"0")}</div>
          ${scoreRing(r.score)}
          <div class="match-body">
            <div class="match-title-row">
              <h4>${esc(r.startup.name)}</h4>
              ${statusBadge(r.startup.verification.status)}
            </div>
            <div class="match-tags">${r.startup.technologies.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
            ${r.reasons.length ? `<div class="match-why"><strong>Why matched:</strong><ul>${r.reasons.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>` : `<div class="match-why faint">Weak keyword overlap.</div>`}
          </div>
        </div>`).join("")}
    </div>`;
}

/* ---------------------------------------------------------
   ============= GOVERNMENT: VERIFIED STARTUPS ==============
   --------------------------------------------------------- */
function renderGovVerified(){
  setMain(`
    ${pageHeader("DPIIT / MSInS Verification", "Verify startup registration against the prototype government registry.")}
    <div class="card section-block">
      <div class="notice info" style="margin-bottom:16px;">Prototype Verification • Mock Government API — no live DPIIT registry is contacted.</div>
      <div class="form-grid">
        <div class="form-field full">
          <label>Startup Registration Number</label>
          <input type="text" id="dpiitInput" placeholder="e.g. DPIIT-2025-001234">
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-start;">
        <button class="btn btn-primary" data-action="run-verify-startup">Verify Startup</button>
      </div>
      <div id="verifyResultHost" style="margin-top:16px;"></div>
    </div>
    <div class="section-block">
      <div class="section-head"><h2>All Startups</h2></div>
      <div id="verifiedStartupsTableHost"></div>
    </div>
  `);
  renderVerifiedStartupsTable();
}
function renderVerifiedStartupsTable(){
  const host = document.getElementById("verifiedStartupsTableHost");
  if(!host) return;
  const rows = DB.startups.map(s=>`
    <tr>
      <td><strong>${esc(s.name)}</strong><br><span class="faint" style="font-size:11.5px;">${esc(s.dpiitNumber)}</span></td>
      <td>${s.technologies.slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</td>
      <td>${esc(s.stage)}</td>
      <td>${s.pilotScore}</td>
      <td>${statusBadge(s.verification.status)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-startup" data-id="${s.id}">View Profile</button></td>
    </tr>`).join("");
  host.innerHTML = buildTable(["Startup","Technologies","Stage","Pilot Score","Verification","Actions"], rows);
}

function runVerifyFromUI(){
  const val = document.getElementById("dpiitInput").value.trim();
  if(!val){ toast("Enter a registration number.", "error"); return; }
  const result = verifyStartup(val);
  const host = document.getElementById("verifyResultHost");
  if(!result.ok){
    host.innerHTML = `<div class="notice" style="border-color:var(--danger-600);background:var(--danger-100);color:var(--danger-600);">${esc(result.message)}</div>`;
    toast("Verification failed — no matching record.", "error");
    return;
  }
  const s = result.startup;
  host.innerHTML = `
    <div class="card" style="border-color:var(--success-600);">
      <div class="card-row" style="margin-bottom:10px;">
        <div><span class="badge badge-success">Verification Status: Verified ✓</span></div>
      </div>
      <div class="kv-grid">
        <div><div class="kv-label">Startup Name</div>${esc(s.name)}</div>
        <div><div class="kv-label">DPIIT Recognition Number</div>${esc(s.dpiitNumber)}</div>
        <div><div class="kv-label">Recognition Date</div>${formatDate(s.verification.recognitionDate)}</div>
        <div><div class="kv-label">Founding Date</div>${formatDate(s.verification.foundingDate)}</div>
        <div><div class="kv-label">Startup Stage</div>${esc(s.stage)}</div>
        <div><div class="kv-label">Technology Categories</div>${s.technologies.join(", ")}</div>
        <div><div class="kv-label">Validation Status</div>${esc(s.verification.validationStatus)}</div>
      </div>
      <div class="form-actions" style="justify-content:flex-start;margin-top:14px;">
        <button class="btn btn-secondary btn-sm" data-action="view-startup" data-id="${s.id}">View Full Profile & Eligibility</button>
      </div>
    </div>`;
  toast(`${s.name} verified successfully.`, "success");
  renderVerifiedStartupsTable();
}

/* ---------------------------------------------------------
   ============= STARTUP PROFILE + ELIGIBILITY (drawer) ======
   --------------------------------------------------------- */
function openStartupProfile(startupId, opts={}){
  const s = getStartup(startupId);
  if(!s) return;
  const role = DB.currentUser.role;
  const initials = s.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const eligibility = calculateStartupEligibility(s);

  const eligibilityCard = `
    <div class="card" style="margin-top:16px;${eligibility.emdWaived ? "border-color:var(--success-600);" : ""}">
      <div class="card-row" style="margin-bottom:10px;">
        <span class="card-title" style="margin-bottom:0;">Procurement Eligibility</span>
        ${eligibility.emdWaived ? `<span class="badge badge-success">✓ Startup Procurement Benefits Activated</span>` : `<span class="badge badge-neutral">Pending Verification</span>`}
      </div>
      <div class="kv-grid">
        <div><div class="kv-label">DPIIT Recognition</div>${eligibility.dpiitRecognized ? "✓ Recognised" : "— Not on file"}</div>
        <div><div class="kv-label">Startup Status</div>${eligibility.verified ? "✓ Active / Verified" : "Unverified"}</div>
        <div><div class="kv-label">EMD Requirement</div>${eligibility.emdWaived ? "₹0 — Waived" : "Standard EMD applies"}</div>
        <div><div class="kv-label">Turnover Requirement</div>${eligibility.turnoverExemption ? "Exemption Applicable" : "Standard criteria applies"}</div>
        <div><div class="kv-label">Experience Requirement</div>${eligibility.experienceExemption ? "Startup exemption rule applicable" : "Standard criteria applies"}</div>
      </div>
      <div class="form-actions" style="justify-content:flex-start;margin-top:12px;">
        <button class="btn btn-ghost btn-sm" data-action="view-rule-explanation" data-id="${s.id}">View Rule Explanation</button>
      </div>
      <div class="notice" style="margin-top:12px;">Prototype rule engine. Actual applicability depends on the applicable tender/procurement policy.</div>
    </div>`;

  const govActions = role==="department" ? `
    <div class="form-actions" style="justify-content:flex-start;margin-top:16px;flex-wrap:wrap;">
      ${s.verification.status!=="verified" ? `<button class="btn btn-secondary btn-sm" data-action="verify-from-profile" data-id="${s.id}">Verify DPIIT</button>` : ""}
      <select id="shortlistChallengeSelect" style="width:auto;min-width:200px;">
        ${DB.challenges.filter(c=>c.status!=="Closed").map(c=>`<option value="${c.id}" ${opts.challengeId===c.id?"selected":""}>${esc(c.title)}</option>`).join("")}
      </select>
      <button class="btn btn-primary btn-sm" data-action="shortlist-from-profile" data-id="${s.id}">Shortlist Startup</button>
    </div>` : "";

  openDrawer({
    title:"Startup Profile",
    bodyHtml:`
      <div class="profile-head">
        <div class="profile-avatar">${initials}</div>
        <div>
          <h2 style="font-size:19px;color:var(--navy-900);">${esc(s.name)}</h2>
          <p class="muted" style="font-size:13px;margin-top:2px;">${esc(s.hq)} · ${esc(s.stage)}</p>
          <div style="margin-top:8px;">${statusBadge(s.verification.status)} <span class="chip">Risk: ${esc(s.riskLevel)}</span></div>
        </div>
      </div>
      <p style="font-size:13.5px;color:var(--text-muted);line-height:1.6;margin-bottom:16px;">${esc(s.description)}</p>
      <div class="kv-grid">
        <div><div class="kv-label">DPIIT Number</div>${esc(s.dpiitNumber)}</div>
        <div><div class="kv-label">Founded</div>${formatDate(s.founded)}</div>
        <div><div class="kv-label">Headquarters</div>${esc(s.hq)}</div>
        <div><div class="kv-label">Team Size</div>${s.teamSize}</div>
        <div><div class="kv-label">Pilot Success Rate</div>${Math.round(s.successRate*100)}%</div>
        <div><div class="kv-label">Average Review Score</div>${s.avgReview} / 5</div>
      </div>
      <div style="margin-top:14px;"><div class="kv-label" style="margin-bottom:6px;">Technology</div>${s.technologies.map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</div>
      <div style="margin-top:14px;"><div class="kv-label" style="margin-bottom:6px;">Problem Areas</div>${s.problemAreas.map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</div>
      <div style="margin-top:14px;"><div class="kv-label" style="margin-bottom:6px;">Portfolio</div>${s.portfolio.map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</div>
      <div style="margin-top:14px;">
        <div class="kv-label" style="margin-bottom:6px;">Previous Government Pilots</div>
        ${s.previousPilots.length ? s.previousPilots.map(p=>`<div class="card" style="padding:10px 14px;margin-bottom:8px;"><strong style="font-size:13px;">${esc(p.name)}</strong><br><span class="muted" style="font-size:12px;">${esc(p.dept)} — ${esc(p.outcome)}</span></div>`).join("") : `<span class="muted" style="font-size:13px;">No previous pilots on record.</span>`}
      </div>
      ${eligibilityCard}
      ${govActions}
    `
  });
}

function viewRuleExplanation(startupId){
  const s = getStartup(startupId);
  const eligibility = calculateStartupEligibility(s);
  openModal({
    title:"Rule Explanation",
    bodyHtml:`<div class="rule-list">
      ${eligibility.rules.map(r=>`
        <div class="rule-item">
          <div class="rule-head"><span>${esc(r.title)}</span>${r.triggered ? statusBadge("Approved") : statusBadge("Pending")}</div>
          <p>${esc(r.explanation)}</p>
        </div>`).join("")}
    </div>
    <div class="notice" style="margin-top:14px;">Prototype rule engine. Actual applicability depends on the applicable tender/procurement policy.</div>`,
    footHtml:`<button class="btn btn-primary" data-action="close-modal">Close</button>`
  });
}

/* ---------------------------------------------------------
   ================ GOVERNMENT: PILOT TRACKER ================
   --------------------------------------------------------- */
function renderGovPilots(){
  const readyToStart = [];
  DB.challenges.forEach(c=>{
    c.shortlist.forEach(sid=>{
      if(!DB.pilots.find(p=>p.challengeId===c.id && p.startupId===sid)){
        readyToStart.push({challenge:c, startup:getStartup(sid)});
      }
    });
  });

  setMain(`
    ${pageHeader("Pilot Sandbox Tracker", "Challenge → PoC → Sandbox → Micro-Pilot → Validation → Scale-Up Procurement")}
    ${readyToStart.length ? `
    <div class="section-block card">
      <div class="card-title">Ready to Start PoC</div>
      <div class="card-sub" style="margin-bottom:12px;">Shortlisted startups awaiting proof-of-concept kickoff.</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${readyToStart.map(r=>`
          <div class="card-row" style="border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
            <div><strong style="font-size:13.5px;">${esc(r.startup.name)}</strong><br><span class="muted" style="font-size:12px;">${esc(r.challenge.title)}</span></div>
            <button class="btn btn-primary btn-sm" data-action="start-poc" data-challenge="${r.challenge.id}" data-startup="${r.startup.id}">Create PoC</button>
          </div>`).join("")}
      </div>
    </div>` : ""}
    <div class="section-block">
      <div class="section-head"><h2>Active Pilots</h2></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${DB.pilots.length ? DB.pilots.map(p=>renderPilotCard(p)).join("") : emptyState("No pilots yet", "Shortlist a startup and create a PoC to begin.")}
      </div>
    </div>
  `);
}

function renderPilotCard(p){
  const startup = getStartup(p.startupId);
  return `
    <div class="card">
      <div class="card-row" style="margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="card-title">${esc(p.title)}</div>
          <div class="card-sub">${esc(p.department)} · ${p.id}</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm" data-action="view-pilot" data-id="${p.id}">View Details</button>
        </div>
      </div>
      ${renderStepper(p)}
    </div>`;
}

function openPilotDetail(pilotId){
  const p = getPilot(pilotId);
  if(!p) return;
  const startup = getStartup(p.startupId);
  const challenge = getChallenge(p.challengeId);
  const stage = p.stages[p.currentStage];
  const role = DB.currentUser.role;
  const canAdvance = role==="department" || role==="admin";

  openDrawer({
    title: p.title, subtitle:`${p.id} · ${esc(p.department)}`,
    bodyHtml:`
      ${renderStepper(p)}
      <div class="card" style="margin-top:20px;">
        <div class="card-title">${esc(stage.name)} — ${statusBadge(stage.status==="active"?"Piloting":stage.status)}</div>
        <p class="muted" style="font-size:13px;margin:8px 0 12px;">${esc(stage.description)}</p>
        <div class="kv-grid" style="margin-bottom:12px;">
          <div><div class="kv-label">Responsible Party</div>${esc(stage.responsible)}</div>
          <div><div class="kv-label">Start Date</div>${formatDate(stage.start)}</div>
          <div><div class="kv-label">Progress</div>${stage.progress}%</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${stage.progress}%;"></div></div>
        ${canAdvance ? `<div class="form-actions" style="justify-content:flex-start;margin-top:16px;">
          ${p.currentStage < p.stages.length-1 ? `<button class="btn btn-primary btn-sm" data-action="advance-pilot" data-id="${p.id}">Advance Stage</button>` : `<span class="badge badge-success">Final Stage Reached</span>`}
          <button class="btn btn-ghost btn-sm" data-action="view-startup" data-id="${startup.id}">View Startup Profile</button>
          ${p.currentStage >= 3 ? `<button class="btn btn-secondary btn-sm" data-action="open-decision-workspace" data-id="${p.id}">Decision &amp; Procurement Workspace</button>` : ""}
        </div>` : `<div class="form-actions" style="justify-content:flex-start;margin-top:16px;"><button class="btn btn-ghost btn-sm" data-action="view-startup" data-id="${startup.id}">View Startup Profile</button></div>`}
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-title">Challenge Context</div>
        <p class="muted" style="font-size:13px;margin-top:6px;">${esc(challenge ? challenge.description : "—")}</p>
      </div>
    `
  });
}

function startPocFromTracker(challengeId, startupId){
  const result = createPilot(challengeId, startupId);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`PoC started for ${getStartup(startupId).name}.`, "success");
  renderGovPilots();
}

function advancePilotFromUI(pilotId){
  const attempt = advancePilotStage(pilotId);
  if(attempt.needsConfirmation){
    confirmDialog({
      title:"Advance Pilot Stage?", message: attempt.message, confirmLabel:"Advance Anyway",
      onConfirm:()=>{
        const forced = advancePilotStage(pilotId, {confirmedSkip:true});
        if(forced.ok){ toast("Pilot advanced to the next stage.", "success"); closeDrawer(); openPilotDetail(pilotId); }
      }
    });
    return;
  }
  if(!attempt.ok){ toast(attempt.message, "error"); return; }
  toast("Pilot advanced to the next stage.", "success");
  closeDrawer();
  openPilotDetail(pilotId);
}

/* ---------------------------------------------------------
   ============= GOVERNMENT: MILESTONES & PAYMENTS ===========
   --------------------------------------------------------- */
function renderGovMilestones(){
  renderMilestoneWorkspace("department");
}
function renderMilestoneWorkspace(roleContext, forcedPilotId){
  const pilots = roleContext==="startup" ? DB.pilots.filter(p=>p.startupId===DB.currentUser.startupId) : DB.pilots;
  const pilotId = forcedPilotId || (pilots[0] && pilots[0].id);
  const options = pilots.map(p=>`<option value="${p.id}" ${p.id===pilotId?"selected":""}>${esc(p.title)} (${p.id})</option>`).join("");

  setMain(`
    ${pageHeader("Milestone & Payment Ledger", "Payment can only release after department approval — never automatically on evidence upload.")}
    <div class="milestone-flow">
      <div class="mf-step">Startup submits evidence</div><div class="mf-arrow">→</div>
      <div class="mf-step">Department reviews</div><div class="mf-arrow">→</div>
      <div class="mf-step">Approved?</div><div class="mf-arrow">→</div>
      <div class="mf-step" style="border-color:var(--success-600);color:var(--success-600);">Payment released</div>
    </div>
    ${pilots.length===0 ? emptyState("No pilots to show milestones for") : `
    <div class="form-field" style="max-width:420px;margin-bottom:18px;">
      <label>Select Pilot</label>
      <select id="milestonePilotSelect">${options}</select>
    </div>
    <div id="milestoneTableHost"></div>
    <div class="notice" style="margin-top:14px;">Prototype Payment Simulation — no real funds are transferred.</div>
    `}
  `);

  if(pilots.length){
    renderMilestoneTable(pilotId, roleContext);
    document.getElementById("milestonePilotSelect").addEventListener("change", e=>{
      renderMilestoneTable(e.target.value, roleContext);
    });
  }
}

function renderMilestoneTable(pilotId, roleContext){
  const host = document.getElementById("milestoneTableHost");
  if(!host) return;
  const milestones = getMilestonesForPilot(pilotId);
  const rows = milestones.map(m=>{
    let actions = "";
    if(roleContext==="startup"){
      if(m.status==="Pending"){
        actions = `<input type="file" id="file-${m.id}" style="max-width:150px;font-size:11.5px;" />
          <button class="btn btn-secondary btn-sm" data-action="submit-evidence" data-id="${m.id}">Submit Evidence</button>`;
      }else if(m.status==="Locked"){
        actions = `<span class="faint" style="font-size:12px;">Awaiting prior milestone</span>`;
      }else{
        actions = `<span class="faint" style="font-size:12px;">Awaiting review</span>`;
      }
    }else{
      if(m.status==="Submitted"){
        actions = `<button class="btn btn-success btn-sm" data-action="approve-milestone" data-id="${m.id}">Approve</button>
          <button class="btn btn-danger btn-sm" data-action="reject-milestone" data-id="${m.id}">Reject</button>`;
      }else if(m.status==="Approved" && m.paymentStatus==="Pending"){
        actions = `<button class="btn btn-primary btn-sm" data-action="release-payment" data-id="${m.id}">Release Payment</button>`;
      }else{
        actions = `<span class="faint" style="font-size:12px;">No action needed</span>`;
      }
    }
    return `<tr>
      <td><strong>${esc(m.name)}</strong><br><span class="faint" style="font-size:11px;">${m.id}</span></td>
      <td>${esc(m.target)}</td>
      <td>${m.evidence ? `<span class="chip">✓ ${esc(m.evidence.filename)}</span>` : `<span class="faint">Not submitted</span>`}</td>
      <td>${statusBadge(m.status)}</td>
      <td>${formatINR(m.paymentAmount)}<br>${statusBadge(m.paymentStatus)}</td>
      <td class="table-actions">${actions}</td>
    </tr>`;
  }).join("");
  host.innerHTML = buildTable(["Milestone","Target","Evidence","Status","Payment","Actions"], rows);
}

function submitEvidenceFromUI(milestoneId){
  const input = document.getElementById(`file-${milestoneId}`);
  const file = input && input.files[0];
  if(!file){ toast("Choose a file to upload as evidence.", "error"); return; }
  const result = submitMilestoneEvidence(milestoneId, file);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Evidence submitted for ${result.milestone.name} ✓`, "success");
  const pilotSelect = document.getElementById("milestonePilotSelect");
  if(pilotSelect) renderMilestoneTable(pilotSelect.value, DB.currentUser.role==="startup"?"startup":"department");
}
function approveMilestoneFromUI(milestoneId){
  const result = approveMilestone(milestoneId);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Milestone approved. Payment now pending release.", "success");
  refreshMilestoneTableUI();
}
function rejectMilestoneFromUI(milestoneId){
  confirmDialog({
    title:"Reject Milestone Evidence?", message:"The startup will need to resubmit evidence for this milestone.", confirmLabel:"Reject", danger:true,
    onConfirm:()=>{
      const result = rejectMilestone(milestoneId, "Evidence did not meet validation criteria");
      if(!result.ok){ toast(result.message, "error"); return; }
      toast("Milestone sent back for revision.", "warn");
      refreshMilestoneTableUI();
    }
  });
}
function releasePaymentFromUI(milestoneId){
  const result = releasePayment(milestoneId);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Payment released: ${formatINR(result.milestone.paymentAmount)}`, "success");
  refreshMilestoneTableUI();
}
function refreshMilestoneTableUI(){
  const sel = document.getElementById("milestonePilotSelect");
  if(sel) renderMilestoneTable(sel.value, DB.currentUser.role==="startup"?"startup":"department");
}

/* ---------------------------------------------------------
   ================= GOVERNMENT: RISK MATRIX =================
   --------------------------------------------------------- */
function renderGovRisk(){
  const pilots = DB.pilots;
  const pilotId = pilots[0] && pilots[0].id;
  setMain(`
    ${pageHeader("Micro-Pilot Risk Assessment", "Prototype Risk Model — not an official government risk standard.")}
    ${pilots.length===0 ? emptyState("No pilots to assess") : `
    <div class="form-field" style="max-width:420px;margin-bottom:18px;">
      <label>Select Pilot</label>
      <select id="riskPilotSelect">${pilots.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join("")}</select>
    </div>
    <div id="riskWorkspace"></div>
    `}
  `);
  if(pilots.length){
    renderRiskWorkspace(pilotId);
    document.getElementById("riskPilotSelect").addEventListener("change", e=>renderRiskWorkspace(e.target.value));
  }
}

function renderRiskWorkspace(pilotId){
  const host = document.getElementById("riskWorkspace");
  const existing = DB.riskAssessments.find(r=>r.pilotId===pilotId);
  const factors = existing ? existing.factors : {maturity:3,readiness:3,complexity:3,dataSensitivity:3,citizenImpact:3,financialExposure:3,infrastructure:3};

  host.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Risk Inputs</div>
        <div class="risk-form" style="margin-top:12px;">
          ${Object.keys(RISK_LABELS).map(key=>`
            <div class="risk-factor">
              <div class="risk-factor-head"><span>${RISK_LABELS[key]}</span><span id="riskVal-${key}">${factors[key]}</span></div>
              <input type="range" min="1" max="5" step="1" value="${factors[key]}" id="riskInput-${key}" oninput="document.getElementById('riskVal-${key}').textContent=this.value">
            </div>`).join("")}
        </div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:16px;">
          <button class="btn btn-primary btn-sm" data-action="calc-risk" data-id="${pilotId}">Calculate Risk</button>
        </div>
      </div>
      <div class="card" id="riskResultCard">
        ${existing ? renderRiskResult(existing) : emptyState("No risk score yet", "Adjust inputs and calculate.")}
      </div>
    </div>`;
}

function renderRiskResult(assessment){
  return `
    <div class="card-title">Overall Risk Score</div>
    <div style="font-size:30px;font-weight:800;color:var(--navy-900);margin:8px 0 2px;">${assessment.score} / 100</div>
    <div style="margin-bottom:14px;">${statusBadge(assessment.category)} <span class="muted" style="font-size:12px;">RISK</span></div>
    ${riskMeter(assessment.score)}
    <div style="margin-top:18px;">
      <div class="kv-label" style="margin-bottom:6px;">Recommendations</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-muted);line-height:1.7;">
        ${assessment.recommendations.map(r=>`<li>${esc(r)}</li>`).join("")}
      </ul>
    </div>
    <div class="form-actions" style="justify-content:flex-start;margin-top:16px;">
      <button class="btn btn-secondary btn-sm" data-action="generate-risk-report" data-id="${assessment.pilotId}">Generate Risk Report (PDF)</button>
    </div>`;
}

function calcRiskFromUI(pilotId){
  const factors = {};
  Object.keys(RISK_LABELS).forEach(key=>{
    factors[key] = Number(document.getElementById(`riskInput-${key}`).value);
  });
  const assessment = calculateRisk(pilotId, factors);
  document.getElementById("riskResultCard").innerHTML = renderRiskResult(assessment);
  toast(`Risk score calculated: ${assessment.score}/100 (${assessment.category})`, "success");
}

/* ---------------------------------------------------------
   ================ GOVERNMENT: COMPLIANCE ====================
   --------------------------------------------------------- */
function renderGovCompliance(){
  const withPilots = DB.pilots;
  const docRows = DB.documents.map(d=>`
    <tr>
      <td>${esc(d.type)}</td>
      <td>${esc(d.filename)}</td>
      <td>${formatDate(d.generatedAt)}</td>
    </tr>`).join("");

  setMain(`
    ${pageHeader("Compliance Documents", "Prototype legal templates — always subject to formal legal review.")}
    <div class="card doc-card section-block">
      <div style="display:flex;gap:14px;align-items:flex-start;flex:1;">
        <div class="doc-card-icon">▣</div>
        <div style="flex:1;">
          <div class="card-title">Mutual NDA & IP Protection</div>
          <p class="muted" style="font-size:13px;margin:6px 0 12px;">Protects confidential startup information and intellectual property during assessment and pilot evaluation.</p>
          <div class="form-grid" style="max-width:520px;">
            <div class="form-field"><label>Pilot</label>
              <select id="ndaPilotSelect">${withPilots.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join("")}</select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="form-actions" style="justify-content:flex-start;margin:-10px 0 26px;">
      <button class="btn btn-primary" data-action="generate-nda" ${withPilots.length===0?"disabled":""}>Generate PDF</button>
    </div>
    <div class="section-block">
      <div class="section-head"><h2>Generated Documents</h2></div>
      ${buildTable(["Type","Filename","Generated On"], docRows)}
    </div>
  `);
}

function generateNdaFromUI(){
  const pilotId = document.getElementById("ndaPilotSelect").value;
  const pilot = getPilot(pilotId);
  if(!pilot) return;
  const result = generateNdaDocument(pilot.challengeId, pilot.startupId);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("NDA & IP Protection document generated.", "success");
  renderGovCompliance();
}

/* ---------------------------------------------------------
   ================= GOVERNMENT: PAYMENTS =====================
   --------------------------------------------------------- */
function renderGovPayments(){
  setMain(`${pageHeader("Payments", "Full milestone payment ledger across all active pilots.")}<div id="paymentsFilterHost"></div><div id="paymentsTableHost"></div>`);
  const host = document.getElementById("paymentsFilterHost");
  host.innerHTML = `<div class="filters-bar">
    <select id="paymentsStatusFilter">
      <option value="all">All Payment Statuses</option>
      <option value="Released">Released</option>
      <option value="Pending">Pending</option>
      <option value="Locked">Locked</option>
    </select>
  </div>`;
  document.getElementById("paymentsStatusFilter").addEventListener("change", renderPaymentsTable);
  renderPaymentsTable();
}
function renderPaymentsTable(){
  const filter = document.getElementById("paymentsStatusFilter") ? document.getElementById("paymentsStatusFilter").value : "all";
  const rows = DB.milestones.filter(m=>filter==="all"||m.paymentStatus===filter).map(m=>{
    const pilot = getPilot(m.pilotId);
    const startup = pilot ? getStartup(pilot.startupId) : null;
    return `<tr>
      <td>${esc(m.name)}<br><span class="faint" style="font-size:11px;">${m.id}</span></td>
      <td>${startup ? esc(startup.name) : "—"}</td>
      <td>${pilot ? esc(pilot.department) : "—"}</td>
      <td>${formatINR(m.paymentAmount)}</td>
      <td>${statusBadge(m.paymentStatus)}</td>
    </tr>`;
  }).join("");
  document.getElementById("paymentsTableHost").innerHTML = buildTable(["Milestone","Startup","Department","Amount","Status"], rows);
}

/* ---------------------------------------------------------
   ================= GOVERNMENT: REPORTS =====================
   --------------------------------------------------------- */
function renderGovReports(){
  setMain(`
    ${pageHeader("Reports", "Program-level summary for presentation and review.")}
    <div class="grid-2 section-block">
      <div class="chart-card"><h4>Pilots by Domain</h4><div class="chart-holder"><canvas id="chDomain"></canvas></div></div>
      <div class="chart-card"><h4>Risk Category Distribution</h4><div class="chart-holder"><canvas id="chRiskDist"></canvas></div></div>
    </div>
  `);
  const domainCounts = {};
  DB.pilots.forEach(p=>{
    const c = getChallenge(p.challengeId);
    if(c) domainCounts[c.domain] = (domainCounts[c.domain]||0)+1;
  });
  renderChart("chDomain", {type:"bar", data:{labels:Object.keys(domainCounts), datasets:[{data:Object.values(domainCounts), backgroundColor:"#0A1E3D", borderRadius:4}]}, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{stepSize:1}}, x:{ticks:{font:{size:10}}}}}});

  const riskCounts = {LOW:0, MEDIUM:0, HIGH:0, CRITICAL:0};
  DB.riskAssessments.forEach(r=>riskCounts[r.category]++);
  renderChart("chRiskDist", {type:"doughnut", data:{labels:Object.keys(riskCounts), datasets:[{data:Object.values(riskCounts), backgroundColor:["#1E7A46","#9A6B00","#B23A2E","#7a1f18"]}]}, options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:11}}}}}});
}

/* ---------------------------------------------------------
   ================= SETTINGS (shared) ========================
   --------------------------------------------------------- */
function renderSettingsView(){
  const u = DB.currentUser;
  setMain(`
    ${pageHeader("Settings", "Prototype account settings.")}
    <div class="card" style="max-width:480px;">
      <div class="kv-grid">
        <div><div class="kv-label">Name</div>${esc(u.name)}</div>
        <div><div class="kv-label">Role</div>${esc(u.title)}</div>
        ${u.dept ? `<div><div class="kv-label">Department</div>${esc(u.dept)}</div>` : ""}
        ${u.startupId ? `<div><div class="kv-label">Startup</div>${esc(getStartup(u.startupId).name)}</div>` : ""}
      </div>
      <div class="form-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="btn btn-ghost btn-sm" data-action="reset-demo">Reset Demo Data</button>
        <button class="btn btn-danger btn-sm" data-action="logout">Sign Out</button>
      </div>
    </div>
  `);
}

/* ---------------------------------------------------------
   ================= AUDIT LOG (shared) ========================
   --------------------------------------------------------- */
function renderAuditLogView(){
  const rows = DB.auditLogs.map(a=>`
    <div class="audit-item">
      <div class="audit-time">${formatClock(a.timestamp)}</div>
      <div><div class="audit-text">${esc(a.text)}</div><div class="audit-meta">${formatDate(a.timestamp)}</div></div>
    </div>`).join("");
  setMain(`
    ${pageHeader("Audit Log", "A complete, timestamped trail of every governance-relevant action in this session.")}
    <div class="card"><div class="audit-list">${rows || emptyState("No activity yet")}</div></div>
  `);
}

/* ===========================================================
   ========================= STARTUP ==========================
   =========================================================== */
function currentStartup(){ return getStartup(DB.currentUser.startupId); }

function renderStartupOverview(){
  const s = currentStartup();
  const myApplications = DB.applications.filter(a=>a.startupId===s.id);
  const myPilots = DB.pilots.filter(p=>p.startupId===s.id);
  const shortlistedCount = DB.challenges.filter(c=>c.shortlist.includes(s.id)).length;
  const myMilestones = DB.milestones.filter(m=>myPilots.some(p=>p.id===m.pilotId));
  const pendingMilestones = myMilestones.filter(m=>m.status==="Pending"||m.status==="Submitted").length;
  const paymentsReceived = myMilestones.filter(m=>m.paymentStatus==="Released").reduce((sum,m)=>sum+m.paymentAmount,0);

  const recommended = matchChallengesForStartup(s).slice(0,3);

  setMain(`
    ${pageHeader("Overview", `${esc(s.name)} — Startup Dashboard`)}
    <div class="section-block stat-grid">
      ${statCard("Verification Status", s.verification.status==="verified"?"Verified":"Unverified", s.verification.status==="verified"?"--success-600":"--warning-600")}
      ${statCard("Active Applications", myApplications.length, "--teal-600")}
      ${statCard("Shortlisted Challenges", shortlistedCount, "--navy-800")}
      ${statCard("Active Pilots", myPilots.length, "--teal-600")}
    </div>
    <div class="section-block stat-grid">
      ${statCard("Pending Milestones", pendingMilestones, "--warning-600")}
      ${statCard("Payments Received", formatINR(paymentsReceived), "--success-600")}
      ${statCard("Average Pilot Score", s.pilotScore, "--teal-600")}
      ${statCard("DPIIT Number", s.dpiitNumber, "--navy-800")}
    </div>
    <div class="section-block">
      <div class="section-head"><h2>Recommended Challenges</h2><span class="muted">AI-matched to your technology profile</span></div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${recommended.length ? recommended.map(r=>renderRecommendedChallengeCard(r,s)).join("") : emptyState("No strong matches yet")}
      </div>
    </div>
    <div class="section-block">
      <div class="section-head"><h2>My Pilots</h2></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${myPilots.length ? myPilots.map(p=>renderPilotCard(p)).join("") : emptyState("No active pilots yet", "Apply to a recommended challenge to get started.")}
      </div>
    </div>
    ${(()=>{
      const myAssignments = assignmentsForStartup(s.id);
      if(!myAssignments.length) return "";
      return `<div class="section-block">
        <div class="section-head"><h2>Expert Review Status</h2><button class="btn btn-ghost btn-sm" data-action="navigate" data-view="su-expert">View Details</button></div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${myAssignments.map(a=>`<div class="card-row" style="border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
            <span style="font-size:13px;font-weight:600;">${esc(getChallenge(a.challengeId).title)}</span>
            ${assignmentBadge(a.status)}
          </div>`).join("")}
        </div>
      </div>`;
    })()}
  `);
}

function matchChallengesForStartup(startup){
  return DB.challenges.filter(c=>c.status!=="Closed").map(c=>{
    const keywords = extractKeywords(`${c.title} ${c.description}`);
    const impliedTags = keywords.map(k=>KEYWORD_TO_TAG[k]).filter(Boolean);
    const overlap = impliedTags.filter(t=>startup.technologies.includes(t));
    const maxPossible = keywords.reduce((s,k)=>s+KEYWORD_WEIGHTS[k],0) || 1;
    const rawScore = keywords.reduce((s,k)=>{
      const tag = KEYWORD_TO_TAG[k];
      return s + (tag && startup.technologies.includes(tag) ? KEYWORD_WEIGHTS[k] : 0);
    },0);
    const score = Math.max(0, Math.min(99, Math.round((rawScore/maxPossible)*100)));
    return {challenge:c, score, matchedTags:[...new Set(overlap)]};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
}

function renderRecommendedChallengeCard(r, startup){
  const already = DB.applications.find(a=>a.challengeId===r.challenge.id && a.startupId===startup.id);
  return `
    <div class="match-card" style="cursor:default;">
      <div style="width:22px;"></div>
      ${scoreRing(r.score)}
      <div class="match-body">
        <div class="match-title-row"><h4>${esc(r.challenge.title)}</h4>${statusBadge(r.challenge.status)}</div>
        <div class="match-tags">${r.challenge.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:10px;">
          ${already ? `<span class="badge badge-neutral">Already Applied</span>` : `<button class="btn btn-primary btn-sm" data-action="apply-challenge" data-id="${r.challenge.id}">Apply</button>`}
          <button class="btn btn-ghost btn-sm" data-action="view-challenge" data-id="${r.challenge.id}">View Challenge</button>
        </div>
      </div>
    </div>`;
}

function renderStartupDiscover(){
  const s = currentStartup();
  const matches = matchChallengesForStartup(s);
  const openChallenges = DB.challenges.filter(c=>c.status!=="Closed");
  const matchMap = Object.fromEntries(matches.map(m=>[m.challenge.id, m.score]));

  const cards = openChallenges.map(c=>{
    const already = DB.applications.find(a=>a.challengeId===c.id && a.startupId===s.id);
    const score = matchMap[c.id] || 0;
    return `<div class="match-card" style="cursor:default;">
      <div style="width:22px;"></div>
      ${scoreRing(score)}
      <div class="match-body">
        <div class="match-title-row"><h4>${esc(c.title)}</h4>${statusBadge(c.status)}</div>
        <p class="muted" style="font-size:12.8px;margin:6px 0;">${esc(c.department)} · ${formatINR(c.budget)} · Deadline ${formatDate(c.deadline)}</p>
        <div class="match-tags">${c.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:10px;">
          ${already ? `<span class="badge badge-neutral">Already Applied</span>` : `<button class="btn btn-primary btn-sm" data-action="apply-challenge" data-id="${c.id}">Apply</button>`}
        </div>
      </div>
    </div>`;
  }).join("");

  setMain(`
    ${pageHeader("Discover Challenges", "Government challenges open for startup applications.")}
    <div style="display:flex;flex-direction:column;gap:12px;">${cards || emptyState("No open challenges right now")}</div>
  `);
}

function applyToChallengeFromUI(challengeId){
  const s = currentStartup();
  const challenge = getChallenge(challengeId);
  if(DB.applications.find(a=>a.challengeId===challengeId && a.startupId===s.id)){
    toast("You've already applied to this challenge.", "warn"); return;
  }
  DB.applications.unshift({id:genId("APP"), challengeId, startupId:s.id, status:"Applied", appliedAt:new Date().toISOString()});
  persist();
  addAuditLog(`${s.name} applied to "${challenge.title}"`);
  addNotification(`Your application to "${challenge.title}" was submitted.`);
  toast("Application submitted.", "success");
  navigateTo(appState.currentView);
}

function renderStartupApplications(){
  const s = currentStartup();
  const rows = DB.applications.filter(a=>a.startupId===s.id).map(a=>{
    const c = getChallenge(a.challengeId);
    return `<tr>
      <td>${c ? esc(c.title) : "—"}</td>
      <td>${c ? esc(c.department) : "—"}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${formatDate(a.appliedAt)}</td>
    </tr>`;
  }).join("");
  setMain(`${pageHeader("My Applications", "Track the status of every challenge you've applied to.")}${buildTable(["Challenge","Department","Status","Applied On"], rows)}`);
}

function renderStartupPilots(){
  const s = currentStartup();
  const myPilots = DB.pilots.filter(p=>p.startupId===s.id);
  setMain(`
    ${pageHeader("My Pilots", "Live status of your pilots across the sandbox lifecycle.")}
    <div style="display:flex;flex-direction:column;gap:14px;">
      ${myPilots.length ? myPilots.map(p=>renderPilotCard(p)).join("") : emptyState("No pilots yet", "Apply to a challenge to begin your pilot journey.")}
    </div>
  `);
}

function renderStartupMilestones(){
  renderMilestoneWorkspace("startup");
}
function renderStartupPayments(){
  const s = currentStartup();
  const myPilots = DB.pilots.filter(p=>p.startupId===s.id).map(p=>p.id);
  const rows = DB.milestones.filter(m=>myPilots.includes(m.pilotId)).map(m=>`
    <tr>
      <td>${esc(m.name)}</td>
      <td>${formatINR(m.paymentAmount)}</td>
      <td>${statusBadge(m.paymentStatus)}</td>
      <td>${statusBadge(m.status)}</td>
    </tr>`).join("");
  setMain(`${pageHeader("Payments", "Milestone payment status across your active pilots.")}${buildTable(["Milestone","Amount","Payment Status","Milestone Status"], rows)}`);
}
function renderStartupDocuments(){
  const s = currentStartup();
  const rows = DB.documents.filter(d=>d.startupId===s.id).map(d=>`
    <tr><td>${esc(d.type)}</td><td>${esc(d.filename)}</td><td>${formatDate(d.generatedAt)}</td></tr>`).join("");
  setMain(`${pageHeader("Documents", "Compliance documents generated for your engagements.")}${buildTable(["Type","Filename","Generated On"], rows)}`);
}
function renderStartupProfile(){
  const s = currentStartup();
  setMain(`
    ${pageHeader("Profile", "Your organisation's profile as seen by government departments.")}
    <div class="card" style="max-width:640px;">
      <div class="profile-head">
        <div class="profile-avatar">${s.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>
        <div><h2 style="font-size:19px;color:var(--navy-900);">${esc(s.name)}</h2><p class="muted" style="font-size:13px;">${esc(s.hq)}</p></div>
      </div>
      <p style="font-size:13.5px;color:var(--text-muted);line-height:1.6;margin-bottom:14px;">${esc(s.description)}</p>
      <div class="kv-grid">
        <div><div class="kv-label">DPIIT Number</div>${esc(s.dpiitNumber)}</div>
        <div><div class="kv-label">Verification</div>${statusBadge(s.verification.status)}</div>
        <div><div class="kv-label">Founded</div>${formatDate(s.founded)}</div>
        <div><div class="kv-label">Team Size</div>${s.teamSize}</div>
      </div>
      <div style="margin-top:14px;">${s.technologies.map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</div>
    </div>
  `);
}

/* ===========================================================
   ========================= ADMIN =============================
   =========================================================== */
function renderAdminOverview(){
  const verifiedStartups = DB.startups.filter(s=>s.verification.status==="verified").length;
  const activeChallenges = DB.challenges.filter(c=>c.status!=="Closed").length;
  const completedPilots = DB.pilots.filter(p=>p.stages[4].status==="done").length;
  const totalFunding = DB.challenges.reduce((s,c)=>s+c.budget,0);
  const paymentsReleased = DB.milestones.filter(m=>m.paymentStatus==="Released").reduce((s,m)=>s+m.paymentAmount,0);
  const highRisk = DB.riskAssessments.filter(r=>r.category==="HIGH"||r.category==="CRITICAL").length;

  setMain(`
    ${pageHeader("Program Overview", "Cross-department view of the full innovation-to-procurement pipeline.")}
    <div class="section-block stat-grid">
      ${statCard("Total Startups", DB.startups.length, "--navy-800")}
      ${statCard("Verified Startups", verifiedStartups, "--success-600")}
      ${statCard("Active Challenges", activeChallenges, "--teal-600")}
      ${statCard("Active Pilots", DB.pilots.length, "--teal-600")}
    </div>
    <div class="section-block stat-grid">
      ${statCard("Completed Pilots", completedPilots, "--success-600")}
      ${statCard("Total Pilot Funding", formatINR(totalFunding), "--navy-800")}
      ${statCard("Payments Released", formatINR(paymentsReleased), "--success-600")}
      ${statCard("High Risk Pilots", highRisk, "--danger-600")}
    </div>
    <div class="grid-2 section-block">
      <div class="chart-card"><h4>Startups by Verification</h4><div class="chart-holder"><canvas id="chVerification"></canvas></div></div>
      <div class="chart-card"><h4>Pilots by Department</h4><div class="chart-holder"><canvas id="chDept"></canvas></div></div>
    </div>
  `);
  renderChart("chVerification", {type:"doughnut", data:{labels:["Verified","Unverified"], datasets:[{data:[verifiedStartups, DB.startups.length-verifiedStartups], backgroundColor:["#1E7A46","#8393A8"]}]}, options:{plugins:{legend:{position:"bottom"}}}});
  const deptCounts = {};
  DB.pilots.forEach(p=>{ deptCounts[p.department] = (deptCounts[p.department]||0)+1; });
  renderChart("chDept", {type:"bar", data:{labels:Object.keys(deptCounts).map(d=>d.split(",")[0]), datasets:[{data:Object.values(deptCounts), backgroundColor:"#0E7C8C", borderRadius:4}]}, options:{indexAxis:"y", plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true, ticks:{stepSize:1}}}}});
}

function renderAdminStartups(){
  setMain(`
    ${pageHeader("Startups", "All startups registered in the prototype program.")}
    <div class="filters-bar">
      <select id="startupStatusFilter"><option value="all">All Verification Statuses</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
    </div>
    <div id="startupsTableHost"></div>
  `);
  document.getElementById("startupStatusFilter").addEventListener("change", renderAdminStartupsTable);
  renderAdminStartupsTable();
}
function renderAdminStartupsTable(){
  const filter = document.getElementById("startupStatusFilter").value;
  const rows = DB.startups.filter(s=>filter==="all"||s.verification.status===filter).map(s=>`
    <tr>
      <td><strong>${esc(s.name)}</strong><br><span class="faint" style="font-size:11px;">${esc(s.dpiitNumber)}</span></td>
      <td>${s.technologies.slice(0,2).map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</td>
      <td>${statusBadge(s.verification.status)}</td>
      <td>${s.pilotScore}</td>
      <td>${esc(s.riskLevel)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-startup" data-id="${s.id}">View</button></td>
    </tr>`).join("");
  document.getElementById("startupsTableHost").innerHTML = buildTable(["Startup","Technology","Verification","Pilot Score","Risk","Actions"], rows);
}

function renderAdminChallenges(){
  setMain(`
    ${pageHeader("Challenges", "Moderate and monitor all published government challenges.")}
    <div class="filters-bar">
      <select id="challengeStatusFilter"><option value="all">All Statuses</option><option>Open</option><option>Shortlisted</option><option>Piloting</option><option>Closed</option></select>
    </div>
    <div id="challengesTableHost"></div>
  `);
  document.getElementById("challengeStatusFilter").addEventListener("change", renderAdminChallengesTable);
  renderAdminChallengesTable();
}
function renderAdminChallengesTable(){
  const filter = document.getElementById("challengeStatusFilter").value;
  const rows = DB.challenges.filter(c=>filter==="all"||c.status===filter).map(c=>`
    <tr>
      <td>${esc(c.title)}</td><td>${esc(c.department)}</td><td>${formatINR(c.budget)}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-challenge" data-id="${c.id}">View</button></td>
    </tr>`).join("");
  document.getElementById("challengesTableHost").innerHTML = buildTable(["Challenge","Department","Budget","Status","Actions"], rows);
}

function renderAdminPilots(){
  const rows = DB.pilots.map(p=>{
    const startup = getStartup(p.startupId);
    const risk = DB.riskAssessments.find(r=>r.pilotId===p.id);
    return `<tr>
      <td>${esc(p.title)}</td><td>${esc(startup.name)}</td><td>${esc(p.department)}</td>
      <td>${esc(p.stages[p.currentStage].name)}</td>
      <td>${risk ? statusBadge(risk.category) : `<span class="faint">Not assessed</span>`}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-pilot" data-id="${p.id}">View</button></td>
    </tr>`;
  }).join("");
  setMain(`${pageHeader("Pilots", "All pilots currently in the sandbox lifecycle.")}${buildTable(["Pilot","Startup","Department","Current Stage","Risk","Actions"], rows)}`);
}

function renderAdminPayments(){
  setMain(`${pageHeader("Payments", "Program-wide milestone payment approvals.")}<div id="paymentsFilterHost"></div><div id="paymentsTableHost"></div>`);
  const host = document.getElementById("paymentsFilterHost");
  host.innerHTML = `<div class="filters-bar">
    <select id="paymentsStatusFilter">
      <option value="all">All Payment Statuses</option><option value="Released">Released</option><option value="Pending">Pending</option><option value="Locked">Locked</option>
    </select></div>`;
  document.getElementById("paymentsStatusFilter").addEventListener("change", renderPaymentsTable);
  renderPaymentsTable();
}

function renderAdminRisk(){
  const rows = DB.riskAssessments.map(r=>{
    const pilot = getPilot(r.pilotId);
    return `<tr>
      <td>${pilot ? esc(pilot.title) : r.pilotId}</td>
      <td>${r.score} / 100</td>
      <td>${statusBadge(r.category)}</td>
      <td>${formatDate(r.date)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-pilot" data-id="${r.pilotId}">View Pilot</button></td>
    </tr>`;
  }).join("");
  const unassessed = DB.pilots.filter(p=>!DB.riskAssessments.find(r=>r.pilotId===p.id));
  setMain(`
    ${pageHeader("Risk Alerts", "All calculated risk assessments across the program.")}
    ${buildTable(["Pilot","Score","Category","Date","Actions"], rows)}
    ${unassessed.length ? `<div class="section-block"><div class="notice" style="margin-top:16px;">${unassessed.length} pilot(s) have not yet been risk-assessed: ${unassessed.map(p=>esc(p.title)).join(", ")}.</div></div>` : ""}
  `);
}

function renderAdminReports(){
  setMain(`
    ${pageHeader("Reports", "Program-wide analytics for review and presentation.")}
    <div class="grid-2 section-block">
      <div class="chart-card"><h4>Challenges by Status</h4><div class="chart-holder"><canvas id="chAdminStatus"></canvas></div></div>
      <div class="chart-card"><h4>Payment Disbursement</h4><div class="chart-holder"><canvas id="chAdminPayments"></canvas></div></div>
    </div>
  `);
  const statusCounts = {Open:0, Shortlisted:0, Piloting:0, Closed:0};
  DB.challenges.forEach(c=>statusCounts[c.status]++);
  renderChart("chAdminStatus", {type:"pie", data:{labels:Object.keys(statusCounts), datasets:[{data:Object.values(statusCounts), backgroundColor:CHART_COLORS}]}, options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:11}}}}}});
  const released = DB.milestones.filter(m=>m.paymentStatus==="Released").reduce((s,m)=>s+m.paymentAmount,0);
  const pending = DB.milestones.filter(m=>m.paymentStatus==="Pending").reduce((s,m)=>s+m.paymentAmount,0);
  const locked = DB.milestones.filter(m=>m.paymentStatus==="Locked").reduce((s,m)=>s+m.paymentAmount,0);
  renderChart("chAdminPayments", {type:"bar", data:{labels:["Released","Pending","Locked"], datasets:[{data:[released,pending,locked], backgroundColor:["#1E7A46","#9A6B00","#8393A8"], borderRadius:4}]}, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{callback:v=>"₹"+(v/1000)+"k"}}}}});
}

/* ---------------------------------------------------------
   ==================== Shared: challenge detail ==============
   --------------------------------------------------------- */
function openChallengeDetail(challengeId){
  const c = getChallenge(challengeId);
  if(!c) return;
  openDrawer({
    title: c.title, subtitle: `${c.id} · ${esc(c.department)}`,
    bodyHtml:`
      <div style="margin-bottom:14px;">${statusBadge(c.status)} <span class="chip">${esc(c.domain)}</span></div>
      <p style="font-size:13.5px;color:var(--text-muted);line-height:1.6;margin-bottom:16px;">${esc(c.description)}</p>
      <div class="kv-grid">
        <div><div class="kv-label">Pilot Budget</div>${formatINR(c.budget)}</div>
        <div><div class="kv-label">Duration</div>${esc(c.duration||"—")}</div>
        <div><div class="kv-label">Location</div>${esc(c.location||"—")}</div>
        <div><div class="kv-label">Deadline</div>${formatDate(c.deadline)}</div>
        <div><div class="kv-label">Required Technology</div>${esc(c.requiredTech||"—")}</div>
        <div><div class="kv-label">Validation Criteria</div>${esc(c.validationCriteria||"—")}</div>
      </div>
      <div style="margin-top:14px;"><div class="kv-label" style="margin-bottom:6px;">Tags</div>${c.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</div>
      <div style="margin-top:16px;">
        <div class="kv-label" style="margin-bottom:8px;">Shortlisted Startups (${c.shortlist.length})</div>
        ${c.shortlist.length ? c.shortlist.map(sid=>{
          const s = getStartup(sid);
          const assignment = latestAssignmentFor(sid, c.id);
          return `<div class="card-row" style="border:1px solid var(--border);border-radius:8px;padding:9px 12px;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <span style="font-size:13px;font-weight:600;">${esc(s.name)}</span>
            ${assignment ? assignmentBadge(assignment.status) : `<span class="badge badge-neutral">Expert Not Assigned</span>`}
            <div class="table-actions">
              ${assignment ? `<button class="btn btn-ghost btn-sm" data-action="view-expert-assessment" data-id="${assignment.id}">View Expert Assessment</button>` : ""}
              <button class="btn btn-ghost btn-sm" data-action="view-startup" data-id="${s.id}">View</button>
            </div>
          </div>`;
        }).join("") : `<span class="muted" style="font-size:13px;">None yet.</span>`}
      </div>
      ${DB.currentUser.role==="department" ? `<div class="form-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="btn btn-primary btn-sm" data-action="goto-matcher-for-challenge" data-id="${c.id}">Find Matching Startups</button>
      </div>` : ""}
    `
  });
}

/* ---------------------------------------------------------
   ==================== Notifications & search =================
   --------------------------------------------------------- */
function renderNotifBadge(){
  const badge = document.getElementById("notifBadge");
  if(!badge) return;
  const unread = DB.notifications.filter(n=>!n.read).length;
  badge.hidden = unread === 0;
}
function toggleNotifPanel(){
  const panel = document.getElementById("notifPanel");
  if(!panel) return;
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  if(willOpen){
    panel.innerHTML = DB.notifications.length ? DB.notifications.slice(0,12).map(n=>`
      <div class="notif-item"><p>${esc(n.text)}</p><time>${timeAgo(n.createdAt)}</time></div>`).join("")
      : `<div class="notif-item"><p class="muted">No notifications yet.</p></div>`;
    markAllNotificationsRead();
    renderNotifBadge();
  }
}

/* ---------------------------------------------------------
   ==================== Demo scenario runner ====================
   --------------------------------------------------------- */
function delay(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function runDemoScenario(){
  if(!DB.currentUser || DB.currentUser.role !== "department"){
    login("department");
    toast("Switched to Government Department view for the demo.", "");
    await delay(400);
  }
  navigateTo("gov-overview");
  toast("Loading SIH demo scenario…", "");
  await delay(500);

  const challenge = getChallenge("CH001");
  appState.matcherText = challenge.description;
  appState.matcherChallengeId = challenge.id;
  navigateTo("gov-matcher");
  await delay(500);
  const results = matchStartups(challenge.description);
  appState.matcherResults = results;
  renderMatcherResults(results);
  toast("AquaSense Technologies matched at 94%+.", "success");
  await delay(700);

  const top = results[0];
  openStartupProfile(top.startup.id, {challengeId:challenge.id});
  await delay(700);

  verifyStartup(top.startup.dpiitNumber);
  openStartupProfile(top.startup.id, {challengeId:challenge.id});
  toast("AquaSense Technologies verified via DPIIT.", "success");
  await delay(700);

  shortlistStartup(challenge.id, "ST001");
  toast("AquaSense Technologies shortlisted.", "success");
  await delay(500);

  const pilotResult = createPilot(challenge.id, "ST001");
  const pilot = pilotResult.pilot;
  closeDrawer();
  navigateTo("gov-pilots");
  toast("Proof-of-concept started.", "success");
  await delay(700);

  advancePilotStage(pilot.id, {confirmedSkip:true});
  await delay(500);
  advancePilotStage(pilot.id, {confirmedSkip:true});
  openPilotDetail(pilot.id);
  toast("Pilot advanced through Sandbox Integration.", "success");
  await delay(800);

  closeDrawer();
  navigateTo("gov-milestones");
  await delay(400);
  const sel = document.getElementById("milestonePilotSelect");
  if(sel){ sel.value = pilot.id; renderMilestoneTable(pilot.id, "department"); }
  await delay(500);

  const firstMilestone = getMilestonesForPilot(pilot.id)[0];
  submitMilestoneEvidence(firstMilestone.id, {name:"pilot_sensor_deployment_report.pdf", type:"application/pdf"});
  renderMilestoneTable(pilot.id, "department");
  toast("Sensor Deployment evidence submitted.", "success");
  await delay(700);

  approveMilestone(firstMilestone.id);
  renderMilestoneTable(pilot.id, "department");
  toast("Milestone approved by department.", "success");
  await delay(600);

  releasePayment(firstMilestone.id);
  renderMilestoneTable(pilot.id, "department");
  toast(`Payment released: ${formatINR(firstMilestone.paymentAmount)}`, "success");
  await delay(800);

  navigateTo("gov-risk");
  await delay(400);
  const riskSelect = document.getElementById("riskPilotSelect");
  if(riskSelect){ riskSelect.value = pilot.id; renderRiskWorkspace(pilot.id); }
  await delay(400);
  calculateRisk(pilot.id, {maturity:2,readiness:2,complexity:3,dataSensitivity:2,citizenImpact:3,financialExposure:2,infrastructure:3});
  renderRiskWorkspace(pilot.id);
  toast("Risk score calculated for the new pilot.", "success");
  await delay(900);

  /* ---- Expert: pre-pilot technical evaluation (EA001 was pre-assigned) ---- */
  navigateTo("gov-expert");
  await delay(400);
  declareNoConflict("EA001");
  submitEvaluation("EA001", {
    scores:{technicalFeasibility:89, innovation:82, deploymentReadiness:85, scalability:80, teamCapability:78, evidenceQuality:82},
    answers:{}, recommendation:"Recommend",
    comments:"Detection pipeline is technically sound and field-validated on comparable lake systems."
  });
  toast("Expert technical evaluation submitted — score 83.7/100.", "success");
  await delay(700);

  /* ---- Pilot advances through Validation into Scale-Up Procurement ---- */
  navigateTo("gov-pilots");
  advancePilotStage(pilot.id, {confirmedSkip:true});
  await delay(400);
  advancePilotStage(pilot.id, {confirmedSkip:true});
  openPilotDetail(pilot.id);
  toast("Pilot completed Validation and reached Scale-Up Procurement.", "success");
  await delay(700);

  /* ---- Expert: post-pilot KPI validation ---- */
  closeDrawer();
  const postAssign = assignExpert({startupId:"ST001", challengeId:challenge.id, expertId:"EXP001", type:"Post-Pilot Technical Validation"});
  declareNoConflict(postAssign.assignment.id);
  const validation = startPilotValidation(postAssign.assignment.id).validation;
  updatePilotMetric(validation.id, 0, {actual:"87.4% (target 90%)", status:"Conditional", evidence:"lake_detection_accuracy_report.pdf", comment:"Marginally below target under heavy monsoon turbidity conditions."});
  updatePilotMetric(validation.id, 1, {actual:"7 min", status:"Pass", evidence:"sensor_response_log.pdf", comment:""});
  updatePilotMetric(validation.id, 2, {actual:"97.2%", status:"Pass", evidence:"sensor_uptime_report.pdf", comment:""});
  updatePilotMetric(validation.id, 3, {actual:"4.1%", status:"Pass", evidence:"lake_detection_accuracy_report.pdf", comment:""});
  submitPilotValidation(validation.id, {recommendation:"Recommend", comments:"Detection accuracy is marginally below target but within acceptable tolerance; recommend proceeding with continued monitoring."});
  toast("KPI validation submitted — 87.5% overall pilot performance.", "success");
  await delay(800);

  /* ---- Public: beneficiary feedback on the live pilot ---- */
  navigateTo("gov-overview");
  await delay(300);
  submitFeedback(pilot.id, {rating:5, answers:{easyToUse:"Yes",reliable:"Yes",solvedProblem:"Yes",responseTime:"Yes"}, comment:"Alerts reached our gram panchayat well before the bloom became visible from the shore.", issueType:"None"});
  submitFeedback(pilot.id, {rating:4, answers:{easyToUse:"Yes",reliable:"Partially",solvedProblem:"Yes",responseTime:"Yes"}, comment:"Recurring short sensor delay after heavy rain, otherwise very reliable.", issueType:"Slow Response"});
  navigateTo("gov-feedback");
  toast("Public feedback recorded for the pilot (positive overall, recurring sensor-delay issue).", "success");
  await delay(800);

  navigateTo("gov-compliance");
  await delay(400);
  const ndaSelect = document.getElementById("ndaPilotSelect");
  if(ndaSelect) ndaSelect.value = pilot.id;
  const ndaResult = generateNdaDocument(challenge.id, "ST001");
  toast(ndaResult.ok ? "NDA & IP Protection PDF generated and downloaded." : ndaResult.message, ndaResult.ok ? "success" : "warn");
  renderGovCompliance();
  await delay(900);

  /* ---- Government decision, procurement handoff and scale-up ---- */
  navigateTo("gov-decision");
  await delay(400);
  openDecisionWorkspace(pilot.id);
  await delay(600);
  makeGovernmentDecision(pilot.id, {
    decision:"APPROVE FOR PROCUREMENT",
    reason:"Expert score 83.7/100, KPI validation 87.5% overall with only response-time and uptime fully meeting target, and public feedback positive overall with one recurring sensor-delay issue tracked for remediation."
  });
  renderDecisionWorkspaceDrawer(pilot.id);
  toast("Government decision recorded: Approve for Procurement.", "success");
  await delay(900);

  createProcurementHandoff(pilot.id, {
    channel:"GeM", externalReference:"", handoffDate:new Date().toISOString().slice(0,10),
    responsibleOfficer: DB.currentUser.name, status:"Handed Off — Awaiting External Response"
  });
  renderDecisionWorkspaceDrawer(pilot.id);
  toast("Procurement handoff created (DEMO) — GeM.", "success");
  await delay(900);

  createScaleUp(pilot.id, {
    targetDepartments:"Water Resources Department, Rural Development Department",
    targetLocations:"Konkan Division, Vidarbha Region",
    rolloutCount:25,
    expectedImpact:"Early-warning coverage extended across 25+ rural lakes prone to seasonal algal blooms."
  });
  renderDecisionWorkspaceDrawer(pilot.id);
  toast("Scale-up plan created — 25 target locations.", "success");
  await delay(900);

  closeDrawer();
  navigateTo("gov-policy");
  await delay(400);
  document.getElementById("policyQuestionInput").value = "What evidence is required before a Government decision?";
  askPolicyAssistantFromUI();
  toast("Policy Assistant answered from the approved knowledge base.", "success");
  await delay(900);

  navigateTo("gov-audit");
  toast("Demo scenario complete — full audit trail below.", "success");
}

/* ---------------------------------------------------------
   ==================== Global event delegation ==================
   --------------------------------------------------------- */
document.addEventListener("click", (e)=>{
  const el = e.target.closest("[data-action]");
  if(!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;

  switch(action){
    case "goto-login": gotoLogin(); break;
    case "goto-landing": gotoLanding(); break;
    case "login": login(el.dataset.role); break;
    case "logout": logout(); break;
    case "navigate": navigateTo(el.dataset.view); break;
    case "toggle-sidebar": document.getElementById("sidebar").classList.toggle("open"); break;
    case "close-modal": closeModal(); break;
    case "close-drawer": closeDrawer(); break;
    case "reset-demo":
      confirmDialog({
        title:"Reset Demo Data?", message:"This restores all startups, challenges, pilots, milestones and logs to their original demo state.", confirmLabel:"Reset Data", danger:true,
        onConfirm:()=>{ resetDemoData(); toast("Demo data has been reset.", "success"); gotoLanding(); }
      });
      break;
    case "open-create-challenge": openCreateChallengeModal(); break;
    case "view-challenge": openChallengeDetail(id); break;
    case "goto-matcher-for-challenge": {
      const c = getChallenge(id);
      appState.matcherText = c.description;
      appState.matcherChallengeId = c.id;
      appState.matcherResults = null;
      closeDrawer();
      navigateTo("gov-matcher");
      break;
    }
    case "run-matcher": runMatcherFromUI(); break;
    case "view-startup-from-match":
    case "view-startup": openStartupProfile(id, {challengeId: appState.matcherChallengeId}); break;
    case "view-rule-explanation": viewRuleExplanation(id); break;
    case "run-verify-startup": runVerifyFromUI(); break;
    case "verify-from-profile": {
      const s = getStartup(id);
      const r = verifyStartup(s.dpiitNumber);
      if(r.ok){ toast(`${s.name} verified.`, "success"); closeDrawer(); openStartupProfile(id); }
      break;
    }
    case "shortlist-from-profile": {
      const challengeId = document.getElementById("shortlistChallengeSelect").value;
      shortlistStartup(challengeId, id);
      toast("Startup shortlisted for the challenge.", "success");
      closeDrawer();
      break;
    }
    case "start-poc": startPocFromTracker(el.dataset.challenge, el.dataset.startup); break;
    case "view-pilot": openPilotDetail(id); break;
    case "advance-pilot": advancePilotFromUI(id); break;
    case "submit-evidence": submitEvidenceFromUI(id); break;
    case "approve-milestone": approveMilestoneFromUI(id); break;
    case "reject-milestone": rejectMilestoneFromUI(id); break;
    case "release-payment": releasePaymentFromUI(id); break;
    case "calc-risk": calcRiskFromUI(id); break;
    case "generate-risk-report": {
      const r = generateRiskReportDocument(id);
      if(!r.ok){ toast(r.message, "error"); break; }
      toast("Risk report PDF generated and downloaded.", "success");
      break;
    }
    case "generate-nda": generateNdaFromUI(); break;
    case "apply-challenge": applyToChallengeFromUI(id); break;
    case "run-demo-scenario": runDemoScenario(); break;
    case "toggle-notifications": toggleNotifPanel(); break;

    /* ---- Expert / Verifier module ---- */
    case "review-assignment": openAssignmentWorkspace(id); break;
    case "verify-evidence": verifyEvidenceFromUI(id); break;
    case "request-clarification": requestClarificationFromUI(id); break;
    case "respond-clarification": respondToClarificationFromUI(id); break;
    case "validate-pilot-metric": validatePilotMetricFromUI(id, Number(el.dataset.index)); break;
    case "view-expert-assessment": openExpertAssessmentDrawer(id); break;
    case "open-assign-expert": openAssignExpertModal(); break;

    /* ---- Public / General User module ---- */
    case "open-public-pilot": openPublicPilotView(id); break;
    case "open-feedback-form": openPublicFeedbackForm(id); break;
    case "open-decision-workspace": openDecisionWorkspace(id); break;
  }
});

// Close notification panel / search results when clicking outside
document.addEventListener("click", (e)=>{
  const notifWrap = e.target.closest(".notif-wrap");
  const panel = document.getElementById("notifPanel");
  if(panel && !notifWrap) panel.hidden = true;

  const searchWrap = e.target.closest(".global-search");
  const results = document.getElementById("globalSearchResults");
  if(results && !searchWrap) results.hidden = true;
});

document.addEventListener("input", (e)=>{
  if(e.target.id === "globalSearchInput"){
    const term = e.target.value;
    const results = document.getElementById("globalSearchResults");
    if(!term.trim()){ results.hidden = true; return; }
    const matches = runGlobalSearch(term);
    if(matches.length === 0){
      results.innerHTML = `<div class="search-result-item"><span class="muted">No results found.</span></div>`;
    }else{
      results.innerHTML = matches.map((m,i)=>`
        <div class="search-result-item" data-search-idx="${i}">
          <div><div style="font-size:13px;font-weight:600;">${esc(m.label)}</div><div class="faint" style="font-size:11.5px;">${esc(m.sub||"")}</div></div>
          <span class="search-result-type">${m.type}</span>
        </div>`).join("");
      results.querySelectorAll("[data-search-idx]").forEach(row=>{
        row.addEventListener("click", ()=>{
          matches[Number(row.dataset.searchIdx)].action();
          results.hidden = true;
          document.getElementById("globalSearchInput").value = "";
        });
      });
    }
    results.hidden = false;
  }
});

document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape"){ closeModal(); closeDrawer(); }
});

/* ---------------------------------------------------------
   ==================== Boot ==================================
   --------------------------------------------------------- */
initDB();
if(DB.currentUser){
  document.getElementById("view-landing").hidden = true;
  document.getElementById("view-login").hidden = true;
  document.getElementById("view-app").hidden = false;
  buildSidebar();
  renderUserChip();
  navigateTo(defaultViewForRole());
}
renderNotifBadge();
