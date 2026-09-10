/* =========================================================
   GovInnovate — public-ui.js
   Rendering for: General User / Beneficiary dashboard +
   feedback, Government Feedback Dashboard, Government
   Decision Workspace, Procurement Handoff, Scale-Up and the
   DEMO Policy Assistant. Business rules live in public.js.
   ========================================================= */

let decisionUIState = { selectedDecision:null };

/* ===========================================================
   ================ GENERAL USER / PUBLIC ======================
   =========================================================== */
function renderPublicDashboard(){
  const pilots = getPublicEligiblePilots();
  setMain(`
    ${pageHeader("Public Dashboard", "View eligible pilots and deployed solutions, and share your experience as a citizen, beneficiary or service user.")}
    <div class="section-block card" style="background:var(--teal-100);border:none;">
      <p style="font-size:12.5px;color:var(--navy-900);margin:0;">This view shows only solution-level information that is safe for public disclosure. Confidential startup documents, private evaluations and procurement-sensitive details are never shown here.</p>
    </div>
    <div class="section-block">
      <div class="section-head"><h2>Eligible Pilots &amp; Deployed Solutions</h2></div>
      <div class="public-pilot-grid">
        ${pilots.length ? pilots.map(p=>renderPublicPilotCard(p)).join("") : ""}
      </div>
      ${pilots.length ? "" : emptyState("No pilots are open for public feedback yet", "Pilots become visible here once they reach Active Micro-Pilot stage or later.")}
    </div>
  `);
}

function renderPublicPilotCard(pilot){
  const view = getPublicPilotView(pilot.id);
  const stats = computeFeedbackStats(pilot.id);
  return `
    <div class="public-pilot-card">
      <h4>${esc(view.challengeTitle)}</h4>
      <div class="muted">${esc(view.solution)} · ${esc(view.department)}</div>
      <div>${statusBadge(view.pilotStatus)}</div>
      <div class="muted">📍 ${esc(view.pilotLocation)}</div>
      ${stats.total ? `<div class="muted">${stats.total} feedback · ★ ${stats.avgRating}/5</div>` : `<div class="muted">No feedback yet — be the first to share yours.</div>`}
      <div class="form-actions" style="justify-content:flex-start;margin-top:6px;">
        <button class="btn btn-primary btn-sm" data-action="open-public-pilot" data-id="${pilot.id}">Open Pilot</button>
      </div>
    </div>`;
}

function openPublicPilotView(pilotId){
  const view = getPublicPilotView(pilotId);
  if(!view){ toast("This pilot is not open for public viewing.", "error"); return; }
  const stats = computeFeedbackStats(pilotId);
  openDrawer({
    title: view.challengeTitle, subtitle: `${esc(view.department)} · ${esc(view.pilotLocation)}`,
    bodyHtml: `
      <div class="card">
        <div class="kv-grid">
          <div><div class="kv-label">Solution</div>${esc(view.solution)}</div>
          <div><div class="kv-label">Startup</div>${esc(view.solution)}</div>
          <div><div class="kv-label">Department</div>${esc(view.department)}</div>
          <div><div class="kv-label">Pilot Location</div>${esc(view.pilotLocation)}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Problem Being Solved</div>${esc(view.problemBeingSolved)}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Basic Description</div>${esc(view.startupDescription)}</div>
          <div><div class="kv-label">Pilot Status</div>${statusBadge(view.pilotStatus)}</div>
          ${stats.total ? `<div><div class="kv-label">Community Rating</div><span class="star-readout">${"★".repeat(Math.round(stats.avgRating))}${"☆".repeat(5-Math.round(stats.avgRating))}</span> ${stats.avgRating}/5 (${stats.total} responses)</div>` : ""}
        </div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:16px;">
          <button class="btn btn-primary" data-action="open-feedback-form" data-id="${pilotId}">Give Feedback</button>
        </div>
      </div>
    `
  });
}

function openPublicFeedbackForm(pilotId){
  const view = getPublicPilotView(pilotId);
  if(!view) return;
  decisionUIState.feedbackRating = 0;
  decisionUIState.feedbackAnswers = {};

  openDrawer({
    title:"Give Feedback", subtitle: view.challengeTitle,
    bodyHtml:`
      <form id="feedbackForm" novalidate>
        <div class="form-field" id="f-rating">
          <label>Overall Rating <span class="req">*</span></label>
          <div class="rating-pills" id="ratingPills">
            ${[1,2,3,4,5].map(n=>`<button type="button" class="rating-pill" data-value="${n}">${n}</button>`).join("")}
          </div>
          <span class="field-error">Please select a rating.</span>
        </div>

        <div class="feedback-questions" style="margin-top:16px;">
          ${FEEDBACK_QUESTIONS.map(q=>`
            <div class="question-row">
              <p>${esc(q.text)}</p>
              <div class="answer-pills" data-qid="${q.id}">
                ${FEEDBACK_ANSWER_OPTIONS.map(opt=>`<button type="button" class="answer-pill" data-qid="${q.id}" data-value="${opt}">${opt}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>

        <div class="form-field" style="margin-top:16px;">
          <label>What problems did you face? (optional)</label>
          <textarea id="feedbackComment" placeholder="Tell us about your experience…"></textarea>
        </div>

        <div class="form-field">
          <label>Issue Type (if applicable)</label>
          <select id="feedbackIssueType">
            <option value="None">No issue to report</option>
            ${ISSUE_TYPES.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("")}
          </select>
        </div>

        <div class="form-actions" style="margin-top:16px;">
          <button type="button" class="btn btn-ghost" data-action="open-public-pilot" data-id="${pilotId}">Back</button>
          <button type="button" class="btn btn-primary" id="submitFeedbackBtn">Submit Feedback</button>
        </div>
      </form>
    `
  });

  document.querySelectorAll("#ratingPills .rating-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      decisionUIState.feedbackRating = Number(btn.dataset.value);
      document.querySelectorAll("#ratingPills .rating-pill").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("f-rating").classList.remove("error");
      document.getElementById("f-rating").querySelector(".field-error").classList.remove("show");
    });
  });
  document.querySelectorAll(".feedback-questions .answer-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const qid = btn.dataset.qid, value = btn.dataset.value;
      decisionUIState.feedbackAnswers[qid] = value;
      document.querySelectorAll(`.feedback-questions .answer-pill[data-qid="${qid}"]`).forEach(b=>{
        b.classList.remove("selected-yes","selected-partially","selected-no");
      });
      btn.classList.add(`selected-${value.toLowerCase()}`);
    });
  });
  document.getElementById("submitFeedbackBtn").addEventListener("click", ()=>submitFeedbackFromUI(pilotId));
}

function submitFeedbackFromUI(pilotId){
  if(!decisionUIState.feedbackRating){
    document.getElementById("f-rating").classList.add("error");
    document.getElementById("f-rating").querySelector(".field-error").classList.add("show");
    return;
  }
  const comment = document.getElementById("feedbackComment").value;
  const issueType = document.getElementById("feedbackIssueType").value;
  const result = submitFeedback(pilotId, {
    rating: decisionUIState.feedbackRating,
    answers: decisionUIState.feedbackAnswers,
    comment, issueType
  });
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Thank you — your feedback has been submitted.", "success");
  closeDrawer();
  if(appState.currentView === "pub-dashboard") renderPublicDashboard();
}

/* ===========================================================
   ============ GOVERNMENT / ADMIN FEEDBACK DASHBOARD ===========
   =========================================================== */
function renderGovFeedbackDashboard(){
  const stats = computeFeedbackStats(null);
  const breakdown = getFeedbackByPilotBreakdown();
  const issueRows = Object.entries(stats.issueTypeCounts).sort((a,b)=>b[1]-a[1]);

  setMain(`
    ${pageHeader("Public Feedback Dashboard", "Real-world beneficiary feedback, aggregated from the General User module. This is an evidence layer — it does not automatically approve procurement.")}
    <div class="section-block">
      <div class="stat-grid">
        ${statCard("Total Feedback", stats.total, "--teal-600")}
        ${statCard("Average Rating", stats.total ? `${stats.avgRating}/5` : "—", "--navy-800")}
        ${statCard("Satisfaction", stats.total ? `${stats.satisfactionPct}%` : "—", "--success-600")}
        ${statCard("Issues Reported", stats.classificationCounts.Issue||0, "--danger-600")}
        ${statCard("Suggestions", stats.classificationCounts.Suggestion||0, "--warning-600")}
      </div>
    </div>
    ${stats.total ? `
    <div class="section-block grid-3">
      <div class="chart-card"><h4>Feedback Classification (DEMO)</h4><div class="chart-holder"><canvas id="chFbClass"></canvas></div></div>
      <div class="chart-card"><h4>Feedback Trend</h4><div class="chart-holder"><canvas id="chFbTrend"></canvas></div></div>
      <div class="chart-card">
        <h4>Common Issues</h4>
        ${issueRows.length ? `<div class="table-wrap"><table class="data-table"><tbody>
          ${issueRows.map(([type,count])=>`<tr><td>${esc(type)}</td><td style="text-align:right;">${count}</td></tr>`).join("")}
        </tbody></table></div>` : emptyState("No issues reported")}
      </div>
    </div>` : ""}
    <div class="section-block card">
      <div class="card-title">Suggestions</div>
      ${stats.suggestions.length ? `<ul style="margin:10px 0 0 18px;font-size:13px;color:var(--text-muted);line-height:1.8;">
        ${stats.suggestions.slice(0,20).map(s=>`<li>${esc(s)}</li>`).join("")}
      </ul>` : `<p class="muted" style="font-size:13px;margin-top:8px;">No suggestions classified yet.</p>`}
    </div>
    <div class="section-block">
      <div class="section-head"><h2>Feedback by Pilot</h2></div>
      ${buildTable(
        ["Pilot","Challenge","Feedback","Avg Rating","Satisfaction","Issues"],
        breakdown.map(b=>`
          <tr>
            <td><strong>${esc(b.pilotTitle)}</strong></td>
            <td>${esc(b.challengeTitle)}</td>
            <td>${b.stats.total}</td>
            <td>${b.stats.avgRating}/5</td>
            <td>${b.stats.satisfactionPct}%</td>
            <td>${b.stats.classificationCounts.Issue||0}</td>
          </tr>`).join("")
      )}
    </div>
  `);

  if(stats.total){
    renderChart("chFbClass", {type:"doughnut", data:{
      labels:Object.keys(stats.classificationCounts), datasets:[{data:Object.values(stats.classificationCounts), backgroundColor:CHART_COLORS}]
    }, options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:11}}}}}});

    renderChart("chFbTrend", {type:"line", data:{
      labels: stats.trend.map(t=>t.day), datasets:[{data:stats.trend.map(t=>t.count), borderColor:"#0E7C8C", backgroundColor:"rgba(14,124,140,0.15)", fill:true, tension:0.3}]
    }, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{stepSize:1}}}}});
  }
}

/* ===========================================================
   ========= GOVERNMENT DECISION / PROCUREMENT / SCALE-UP ========
   =========================================================== */
function renderGovDecisionList(){
  const candidates = DB.pilots.filter(p=>p.currentStage >= 3);
  setMain(`
    ${pageHeader("Decision & Procurement Workspace", "Pilot Evidence → Expert Validation → User Feedback → Government Review → Procurement Readiness → Procurement Handoff → Scale-Up.")}
    <div class="section-block">
      ${candidates.length ? buildTable(
        ["Pilot","Department","Government Decision","Procurement","Scale-Up","Actions"],
        candidates.map(p=>{
          const decision = getLatestDecisionForPilot(p.id);
          const handoff = getHandoffForPilot(p.id);
          const scaleUp = getScaleUpForPilot(p.id);
          return `<tr>
            <td><strong>${esc(p.title)}</strong><br><span class="faint" style="font-size:11.5px;">${p.id}</span></td>
            <td>${esc(p.department)}</td>
            <td>${decision ? statusBadge(decision.decision.includes("APPROVE") ? "Approved" : (decision.decision==="DO NOT PROCEED" ? "Rejected" : "Pending")) : `<span class="badge badge-neutral">No Decision Yet</span>`} ${decision ? `<div class="faint" style="font-size:11px;margin-top:2px;">${esc(decision.decision)}</div>` : ""}</td>
            <td>${handoff ? statusBadge("Approved") + `<div class="faint" style="font-size:11px;margin-top:2px;">${esc(handoff.channel)}</div>` : `<span class="badge badge-neutral">—</span>`}</td>
            <td>${scaleUp ? `<span class="badge badge-warning">${esc(scaleUp.deploymentStatus)}</span>` : `<span class="badge badge-neutral">—</span>`}</td>
            <td><button class="btn btn-primary btn-sm" data-action="open-decision-workspace" data-id="${p.id}">Open Workspace</button></td>
          </tr>`;
        }).join("")
      ) : emptyState("No pilots ready for decision yet", "A pilot becomes eligible once its Validation stage is complete.")}
    </div>
  `);
}

function metricRowIcon(status){
  if(status==="Pass") return `<span style="color:var(--success-600);font-weight:800;">✓</span>`;
  if(status==="Fail") return `<span style="color:var(--danger-600);font-weight:800;">✗</span>`;
  return `<span style="color:var(--text-faint);font-weight:800;">—</span>`;
}

function openDecisionWorkspace(pilotId){
  decisionUIState.selectedDecision = null;
  renderDecisionWorkspaceDrawer(pilotId);
}

function renderDecisionWorkspaceDrawer(pilotId){
  const bundle = getDecisionEvidenceBundle(pilotId);
  if(!bundle){ toast("Pilot not found.", "error"); return; }
  const { pilot, challenge, startup } = bundle;
  const decision = getLatestDecisionForPilot(pilotId);
  const readiness = getProcurementReadiness(pilotId);
  const handoff = getHandoffForPilot(pilotId);
  const scaleUp = getScaleUpForPilot(pilotId);
  const canDecide = DB.currentUser.role === "department";

  openDrawer({
    title: pilot.title, subtitle: `${esc(pilot.department)} · ${startup ? esc(startup.name) : ""}`,
    bodyHtml: `
      <div class="card">
        <div class="card-title">Technical Evidence</div>
        ${bundle.technicalEvidence.count ? `
          <p class="muted" style="font-size:12.5px;margin:6px 0 10px;">${bundle.technicalEvidence.verified}/${bundle.technicalEvidence.count} items verified by the assigned Expert.</p>
          ${bundle.technicalEvidence.items.map(e=>`<div class="card-row" style="font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--border);"><span>${esc(e.evidenceName)}</span>${statusBadge(e.status)}</div>`).join("")}
        ` : emptyState("No technical evidence recorded yet")}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Pilot Metrics (KPI Validation)</div>
        ${bundle.pilotMetrics.length ? buildTable(["Metric","Target","Actual","Status"], bundle.pilotMetrics.map(m=>`
          <tr><td>${esc(m.name)}</td><td>${esc(m.target)}</td><td>${esc(m.actual||"—")}</td><td>${metricRowIcon(m.status)} ${esc(m.status)}</td></tr>
        `).join("")) : emptyState("No validated KPI metrics yet")}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Expert Validation</div>
        ${bundle.expertValidation.preEvaluation ? `
          <div class="kv-grid" style="margin-top:8px;">
            <div><div class="kv-label">Pre-Pilot Expert Score</div>${bundle.expertValidation.preEvaluation.overallScore}/100</div>
            <div><div class="kv-label">Pre-Pilot Recommendation</div>${esc(bundle.expertValidation.preEvaluation.recommendation)}</div>
          </div>` : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No pre-pilot technical evaluation on record.</p>`}
        ${bundle.expertValidation.postValidation ? `
          <div class="kv-grid" style="margin-top:8px;">
            <div><div class="kv-label">Post-Pilot Overall Result</div>${bundle.expertValidation.postValidation.overallResult}%</div>
            <div><div class="kv-label">Post-Pilot Recommendation</div>${esc(bundle.expertValidation.postValidation.recommendation)}</div>
          </div>` : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No post-pilot validation on record.</p>`}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">User Feedback</div>
        ${bundle.userFeedback.total ? `
          <div class="kv-grid" style="margin-top:8px;">
            <div><div class="kv-label">Total Feedback</div>${bundle.userFeedback.total}</div>
            <div><div class="kv-label">Average Rating</div>${bundle.userFeedback.avgRating}/5</div>
            <div><div class="kv-label">Satisfaction</div>${bundle.userFeedback.satisfactionPct}%</div>
            <div><div class="kv-label">Issues Reported</div>${bundle.userFeedback.classificationCounts.Issue||0}</div>
          </div>` : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No public feedback submitted yet for this pilot.</p>`}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Risk</div>
        ${bundle.risk ? `<div class="kv-grid" style="margin-top:8px;"><div><div class="kv-label">Score</div>${bundle.risk.score}/100</div><div><div class="kv-label">Category</div>${statusBadge(bundle.risk.category)}</div></div>` : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No risk assessment calculated yet.</p>`}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Cost</div>
        <div class="kv-grid" style="margin-top:8px;">
          <div><div class="kv-label">Pilot Budget</div>${bundle.cost.budget ? formatINR(bundle.cost.budget) : "—"}</div>
          <div><div class="kv-label">Released / Total Milestone Value</div>${formatINR(bundle.cost.released)} / ${formatINR(bundle.cost.total)}</div>
        </div>
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Issues</div>
        ${bundle.issues.length ? bundle.issues.map(i=>`<div class="card-row" style="font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--border);"><span>${esc(i.issueType)}</span><span class="muted">${esc(i.comment||"—")}</span></div>`).join("") : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No open issues.</p>`}
      </div>

      ${renderDecisionSection(pilot, decision, canDecide)}
      ${decision && (decision.decision==="APPROVE FOR PROCUREMENT" || decision.decision==="APPROVE WITH CONDITIONS") ? renderProcurementSection(pilot, readiness, handoff, canDecide) : ""}
      ${handoff ? renderScaleUpSection(pilot, scaleUp, canDecide) : ""}
    `
  });

  wireDecisionWorkspace(pilotId);
}

function renderDecisionSection(pilot, decision, canDecide){
  return `
    <div class="card" style="margin-top:14px;">
      <div class="card-title">Government Decision</div>
      ${decision ? `
        <div class="kv-grid" style="margin-top:8px;">
          <div><div class="kv-label">Decision</div>${statusBadge(decision.decision.includes("APPROVE") ? "Approved" : (decision.decision==="DO NOT PROCEED" ? "Rejected" : "Pending"))} <span style="font-size:12.5px;">${esc(decision.decision)}</span></div>
          <div><div class="kv-label">Decision Maker</div>${esc(decision.decisionMaker)}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Reason</div>${esc(decision.reason)}</div>
          <div><div class="kv-label">Timestamp</div>${formatDate(decision.timestamp)} ${formatClock(decision.timestamp)}</div>
        </div>
      ` : `<p class="muted" style="font-size:12.5px;margin-top:6px;">No decision recorded yet. AI cannot make this decision. Expert cannot make this decision. Only Government decides.</p>`}
      ${canDecide ? `
        <div style="margin-top:14px;">
          <button class="btn btn-secondary btn-sm" id="toggleDecisionFormBtn">${decision ? "Record a New Decision" : "Make Decision"}</button>
          <div id="decisionFormWrap" hidden style="margin-top:12px;">
            <div class="decision-options" id="decisionOptions">
              ${GOV_DECISION_OPTIONS.map(o=>`<div class="decision-card" data-decision="${o.key}"><h5>${esc(o.label)}</h5><p>${esc(o.desc)}</p></div>`).join("")}
            </div>
            <div class="form-field" id="f-decision-reason" style="margin-top:10px;">
              <label>Decision Reason <span class="req">*</span></label>
              <textarea id="decisionReasonInput" placeholder="Explain the basis for this decision, referencing the evidence above…"></textarea>
              <span class="field-error">A decision reason is required.</span>
            </div>
            <div class="form-actions" style="justify-content:flex-start;">
              <button class="btn btn-primary btn-sm" id="submitDecisionBtn" data-id="${pilot.id}">Record Decision</button>
            </div>
          </div>
        </div>
      ` : ""}
    </div>`;
}

function renderProcurementSection(pilot, readiness, handoff, canDecide){
  return `
    <div class="card" style="margin-top:14px;">
      <div class="card-title">Procurement Readiness</div>
      <div class="checklist">
        ${readiness.checklist.map(c=>`<div class="checklist-item ${c.pass?"pass":"fail"}"><span class="ci-mark">${c.pass?"✓":"○"}</span>${esc(c.label)}</div>`).join("")}
      </div>
      <div style="margin-top:6px;">${readiness.ready ? `<span class="badge badge-success">PROCUREMENT READY</span>` : `<span class="badge badge-neutral">NOT READY</span>`}</div>

      ${handoff ? `
        <div class="kv-grid" style="margin-top:14px;">
          <div><div class="kv-label">Channel (Simulated)</div>${esc(handoff.channel)}</div>
          <div><div class="kv-label">External Reference (Simulated)</div>${esc(handoff.externalReference)}</div>
          <div><div class="kv-label">Handoff Date</div>${formatDate(handoff.handoffDate)}</div>
          <div><div class="kv-label">Responsible Officer</div>${esc(handoff.responsibleOfficer)}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Status</div>${esc(handoff.status)}</div>
        </div>
        ${canDecide ? `
        <div class="form-field" style="margin-top:10px;">
          <label>Update Status</label>
          <select id="handoffStatusSelect">
            ${["Handed Off — Awaiting External Response","Acknowledged by Procurement Cell","Tender/Process In Progress","Awarded","Closed"].map(s=>`<option value="${esc(s)}" ${handoff.status===s?"selected":""}>${esc(s)}</option>`).join("")}
          </select>
        </div>
        <div class="form-actions" style="justify-content:flex-start;">
          <button class="btn btn-secondary btn-sm" id="updateHandoffBtn" data-id="${handoff.id}">Update Status</button>
        </div>` : ""}
        <p class="muted" style="font-size:11.5px;margin-top:10px;">External Procurement Handoff — DEMO. This is a simulated reference only; GovInnovate does not integrate with real GeM or MahaTenders systems.</p>
      ` : (readiness.ready && canDecide ? `
        <form id="handoffForm" style="margin-top:14px;" novalidate>
          <div class="form-grid">
            <div class="form-field" id="f-channel"><label>Procurement Channel <span class="req">*</span></label>
              <select name="channel">${PROCUREMENT_CHANNELS.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
            <div class="form-field"><label>External Reference (Simulated)</label>
              <input type="text" name="externalReference" placeholder="Leave blank to auto-generate a demo reference"></div>
            <div class="form-field"><label>Handoff Date</label>
              <input type="date" name="handoffDate" value="${new Date().toISOString().slice(0,10)}"></div>
            <div class="form-field" id="f-officer"><label>Responsible Officer <span class="req">*</span></label>
              <input type="text" name="responsibleOfficer" value="${DB.currentUser ? esc(DB.currentUser.name) : ""}"></div>
          </div>
          <div class="form-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn-primary btn-sm" id="submitHandoffBtn" data-id="${pilot.id}">Confirm Procurement Handoff (DEMO)</button>
          </div>
        </form>
      ` : `<p class="muted" style="font-size:12.5px;margin-top:10px;">This pilot is not yet procurement ready — complete the missing checklist items above before a handoff can be created.</p>`)}
    </div>`;
}

function renderScaleUpSection(pilot, scaleUp, canDecide){
  const pipeline = ["Pilot","Procurement","Scale","Impact"];
  const reachedIdx = scaleUp ? (scaleUp.deploymentStatus==="COMPLETED" || scaleUp.deploymentStatus==="SCALED" ? 3 : (scaleUp.deploymentStatus==="IN ROLLOUT" || scaleUp.deploymentStatus==="APPROVED" ? 2 : 1)) : 1;
  return `
    <div class="card" style="margin-top:14px;">
      <div class="card-title">Scale-Up</div>
      <div class="pipeline-strip">
        ${pipeline.map((n,i)=>`${i>0?'<span class="pipeline-arrow">→</span>':""}<span class="pipeline-node ${i<=reachedIdx?"reached":""}">${n}</span>`).join("")}
      </div>
      ${scaleUp ? `
        <div class="kv-grid" style="margin-top:8px;">
          <div><div class="kv-label">Target Departments</div>${esc(scaleUp.targetDepartments||"—")}</div>
          <div><div class="kv-label">Target Locations</div>${esc(scaleUp.targetLocations||"—")}</div>
          <div><div class="kv-label">Rollout Count</div>${scaleUp.rolloutCount}</div>
          <div><div class="kv-label">Deployment Status</div>${statusBadge(scaleUp.deploymentStatus==="COMPLETED"||scaleUp.deploymentStatus==="SCALED"?"Approved":"Piloting")} ${esc(scaleUp.deploymentStatus)}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Expected Impact</div>${esc(scaleUp.expectedImpact||"—")}</div>
          <div class="full" style="grid-column:1/-1;"><div class="kv-label">Actual Impact</div>${esc(scaleUp.actualImpact||"Not yet reported")}</div>
        </div>
        ${canDecide ? `
        <div class="form-grid" style="margin-top:10px;">
          <div class="form-field"><label>Update Deployment Status</label>
            <select id="scaleUpStatusSelect">${SCALEUP_STATUSES.map(s=>`<option value="${s}" ${scaleUp.deploymentStatus===s?"selected":""}>${s}</option>`).join("")}</select></div>
          <div class="form-field full"><label>Actual Impact</label>
            <textarea id="scaleUpImpactInput" placeholder="Record real-world impact once observed…">${esc(scaleUp.actualImpact||"")}</textarea></div>
        </div>
        <div class="form-actions" style="justify-content:flex-start;">
          <button class="btn btn-secondary btn-sm" id="updateScaleUpBtn" data-id="${scaleUp.id}">Update Scale-Up</button>
        </div>` : ""}
      ` : (canDecide ? `
        <form id="scaleUpForm" style="margin-top:12px;" novalidate>
          <div class="form-grid">
            <div class="form-field"><label>Target Departments</label><input type="text" name="targetDepartments" placeholder="e.g. Water Resources, Urban Development"></div>
            <div class="form-field"><label>Target Locations</label><input type="text" name="targetLocations" placeholder="e.g. Konkan Division, Vidarbha Region"></div>
            <div class="form-field"><label>Rollout Count</label><input type="number" name="rolloutCount" min="0" placeholder="e.g. 25"></div>
            <div class="form-field full"><label>Expected Impact</label><input type="text" name="expectedImpact" placeholder="e.g. Early-warning coverage across 25+ rural lakes"></div>
          </div>
          <div class="form-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn-primary btn-sm" id="submitScaleUpBtn" data-id="${pilot.id}">Initiate Scale-Up</button>
          </div>
        </form>
      ` : `<p class="muted" style="font-size:12.5px;margin-top:8px;">Scale-up has not been initiated yet.</p>`)}
    </div>`;
}

function wireDecisionWorkspace(pilotId){
  document.querySelectorAll(".decision-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      decisionUIState.selectedDecision = card.dataset.decision;
      document.querySelectorAll(".decision-card").forEach(c=>c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });
  const toggleBtn = document.getElementById("toggleDecisionFormBtn");
  if(toggleBtn) toggleBtn.addEventListener("click", ()=>{
    const wrap = document.getElementById("decisionFormWrap");
    wrap.hidden = !wrap.hidden;
  });
  const submitDecisionBtn = document.getElementById("submitDecisionBtn");
  if(submitDecisionBtn) submitDecisionBtn.addEventListener("click", ()=>submitGovernmentDecisionFromUI(pilotId));

  const submitHandoffBtn = document.getElementById("submitHandoffBtn");
  if(submitHandoffBtn) submitHandoffBtn.addEventListener("click", ()=>submitProcurementHandoffFromUI(pilotId));
  const updateHandoffBtn = document.getElementById("updateHandoffBtn");
  if(updateHandoffBtn) updateHandoffBtn.addEventListener("click", ()=>{
    const status = document.getElementById("handoffStatusSelect").value;
    updateProcurementHandoffStatus(updateHandoffBtn.dataset.id, status);
    toast("Procurement handoff status updated.", "success");
    renderDecisionWorkspaceDrawer(pilotId);
    if(appState.currentView === "gov-decision") renderGovDecisionList();
  });

  const submitScaleUpBtn = document.getElementById("submitScaleUpBtn");
  if(submitScaleUpBtn) submitScaleUpBtn.addEventListener("click", ()=>submitScaleUpFromUI(pilotId));
  const updateScaleUpBtn = document.getElementById("updateScaleUpBtn");
  if(updateScaleUpBtn) updateScaleUpBtn.addEventListener("click", ()=>{
    const deploymentStatus = document.getElementById("scaleUpStatusSelect").value;
    const actualImpact = document.getElementById("scaleUpImpactInput").value;
    updateScaleUp(updateScaleUpBtn.dataset.id, {deploymentStatus, actualImpact});
    toast("Scale-up updated.", "success");
    renderDecisionWorkspaceDrawer(pilotId);
    if(appState.currentView === "gov-decision") renderGovDecisionList();
  });
}

function submitGovernmentDecisionFromUI(pilotId){
  const reason = document.getElementById("decisionReasonInput").value;
  if(!decisionUIState.selectedDecision || !reason.trim()){
    if(!reason.trim()){
      document.getElementById("f-decision-reason").classList.add("error");
      document.getElementById("f-decision-reason").querySelector(".field-error").classList.add("show");
    }
    if(!decisionUIState.selectedDecision) toast("Select a decision option.", "error");
    return;
  }
  const result = makeGovernmentDecision(pilotId, {decision: decisionUIState.selectedDecision, reason});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Decision recorded: ${result.decision.decision}`, "success");
  renderDecisionWorkspaceDrawer(pilotId);
  if(appState.currentView === "gov-decision") renderGovDecisionList();
}

function submitProcurementHandoffFromUI(pilotId){
  const form = document.getElementById("handoffForm");
  const data = Object.fromEntries(new FormData(form).entries());
  const result = createProcurementHandoff(pilotId, data);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Procurement handoff created (DEMO).", "success");
  renderDecisionWorkspaceDrawer(pilotId);
  if(appState.currentView === "gov-decision") renderGovDecisionList();
}

function submitScaleUpFromUI(pilotId){
  const form = document.getElementById("scaleUpForm");
  const data = Object.fromEntries(new FormData(form).entries());
  const result = createScaleUp(pilotId, data);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Scale-up plan created.", "success");
  renderDecisionWorkspaceDrawer(pilotId);
  if(appState.currentView === "gov-decision") renderGovDecisionList();
}

/* ===========================================================
   ==================== DEMO POLICY ASSISTANT ===================
   =========================================================== */
const POLICY_SAMPLE_QUESTIONS = [
  "What evidence is required?",
  "What documents are needed for pilot validation?",
  "What does the approved procurement document say?",
  "What is the pilot process?"
];

function renderPolicyAssistant(){
  if(!appState.policyLog) appState.policyLog = [];
  setMain(`
    ${pageHeader("Policy Assistant", "Ask questions about the pilot process, evidence requirements, feedback and procurement handoff.")}
    <div class="section-block card">
      <span class="policy-demo-tag">DEMO POLICY ASSISTANT</span>
      <p class="muted" style="font-size:12.5px;margin:0 0 12px;">Answers are retrieved only from this project's approved knowledge base — never invented. If nothing relevant is found, the assistant says so.</p>
      <form id="policyForm" novalidate>
        <div class="form-field full">
          <textarea id="policyQuestionInput" placeholder="e.g. What evidence is required before a Government decision?" style="min-height:60px;"></textarea>
        </div>
        <div class="form-actions" style="justify-content:flex-start;">
          <button type="button" class="btn btn-primary btn-sm" id="askPolicyBtn">Ask</button>
        </div>
      </form>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
        ${POLICY_SAMPLE_QUESTIONS.map(q=>`<button class="btn btn-ghost btn-sm policy-sample-q" data-q="${esc(q)}">${esc(q)}</button>`).join("")}
      </div>
      <div class="policy-qa-log" id="policyQaLog">
        ${appState.policyLog.map(renderPolicyQaItem).join("")}
      </div>
    </div>
  `);

  document.getElementById("askPolicyBtn").addEventListener("click", askPolicyAssistantFromUI);
  document.querySelectorAll(".policy-sample-q").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.getElementById("policyQuestionInput").value = btn.dataset.q;
      askPolicyAssistantFromUI();
    });
  });
}

function renderPolicyQaItem(item){
  return `
    <div class="policy-qa-item">
      <p class="policy-qa-question">${esc(item.question)}</p>
      <p class="policy-qa-answer">${esc(item.answer)}</p>
      ${item.source ? `<p class="policy-qa-source">Source: ${esc(item.source)}</p>` : `<p class="policy-qa-source" style="color:var(--text-faint);">No source found</p>`}
    </div>`;
}

function askPolicyAssistantFromUI(){
  const input = document.getElementById("policyQuestionInput");
  const question = input.value.trim();
  if(!question){ toast("Type a question first.", "error"); return; }
  const result = answerPolicyQuestion(question);
  appState.policyLog.unshift(result);
  input.value = "";
  document.getElementById("policyQaLog").innerHTML = appState.policyLog.map(renderPolicyQaItem).join("");
  addAuditLog(`Policy Assistant queried — "${question}"`);
  persist();
}
