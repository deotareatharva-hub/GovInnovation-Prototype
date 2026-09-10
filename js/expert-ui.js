/* =========================================================
   GovInnovate — expert-ui.js
   All rendering for the Expert / Verifier module, plus the
   Admin "Assign Expert" screen and the read-only Government /
   Startup integration views. Business logic lives in expert.js;
   this file only builds HTML and wires interactions, reusing
   the existing UI primitives from ui.js and helpers from app.js.
   ========================================================= */

/* Ephemeral in-progress evaluation state (reset whenever a workspace opens) */
let evalUIState = {answers:{}, recommendation:null};

function currentExpert(){ return getExpert(DB.currentUser.expertId); }

/* ===========================================================
   ===================== EXPERT: OVERVIEW =====================
   =========================================================== */
function renderExpertOverview(){
  const expert = currentExpert();
  const assignments = getAssignmentsForExpert(expert.id);
  const pending = assignments.filter(a=>a.status==="Awaiting Expert Review").length;
  const active = assignments.filter(a=>a.status==="Under Evaluation" || a.status==="Pilot Validation Pending").length;
  const completedStatuses = ["Recommended","Recommended with Conditions","Not Recommended","Pilot Validated"];
  const completed = assignments.filter(a=>completedStatuses.includes(a.status));
  const scores = completed.map(a=>{
    const ev = getEvaluationForAssignment(a.id);
    return ev ? ev.overallScore : null;
  }).filter(v=>v!==null);
  const avgScore = scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length) : 0;

  setMain(`
    ${pageHeader("Expert Verification Dashboard", "Independently evaluate startup capabilities, technical feasibility and pilot outcomes.")}
    <div class="expert-id-strip">
      <div class="expert-avatar">${expert.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>
      <div class="expert-meta">
        <span class="expert-name">${esc(expert.name)}</span>
        <span class="expert-sub">${esc(expert.domain)} · ${expert.experience} years experience · ${esc(expert.organization)}</span>
      </div>
      <span class="coi-pill">● Verification Status: ${esc(expert.status)}</span>
    </div>
    <div class="section-block stat-grid">
      ${statCard("Pending Reviews", pending, "--warning-600")}
      ${statCard("Assigned Startups", assignments.length, "--navy-800")}
      ${statCard("Active Evaluations", active, "--teal-600")}
      ${statCard("Completed Reviews", completed.length, "--success-600")}
    </div>
    <div class="section-block stat-grid">
      ${statCard("Average Expert Score", avgScore + "%", "--teal-600")}
      ${statCard("Verified Evidence Items", DB.evidenceReviews.filter(e=>e.status==="Verified").length, "--success-600")}
      ${statCard("Clarifications Pending", DB.expertClarifications.filter(c=>c.status==="Pending").length, "--warning-600")}
      ${statCard("Pilot Validations Filed", DB.pilotValidations.filter(v=>v.status==="Submitted").length, "--navy-800")}
    </div>
    <div class="section-block">
      <div class="section-head"><h2>Review Queue</h2><span class="muted">Assignments awaiting your action</span></div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${assignments.filter(a=>!completedStatuses.includes(a.status) && a.status!=="Declined").length
          ? assignments.filter(a=>!completedStatuses.includes(a.status) && a.status!=="Declined").map(a=>renderQueueCard(a)).join("")
          : emptyState("Nothing pending", "All assigned evaluations are up to date.")}
      </div>
    </div>
  `);
}

function statusToBadgeClass(status){ return EXPERT_STATUS_BADGES[status] || "badge-neutral"; }

function assignmentBadge(status){
  return `<span class="badge ${statusToBadgeClass(status)}">${esc(status)}</span>`;
}

function renderQueueCard(a){
  const startup = getStartup(a.startupId);
  const challenge = getChallenge(a.challengeId);
  return `
    <div class="queue-card">
      <div class="queue-card-main">
        <div class="queue-card-title">${esc(startup.name)}</div>
        <div class="queue-card-sub">${esc(challenge.title)} · ${esc(a.type)}</div>
        <div class="queue-card-tags">
          ${statusBadge(startup.verification.status)}
          <span class="chip">Deadline: ${formatDate(a.deadline)}</span>
        </div>
      </div>
      ${assignmentBadge(a.status)}
      <button class="btn btn-primary btn-sm" data-action="review-assignment" data-id="${a.id}">Review</button>
    </div>`;
}

/* ===========================================================
   ==================== EXPERT: REVIEW QUEUE ===================
   =========================================================== */
function renderExpertQueue(){
  const expert = currentExpert();
  const assignments = getAssignmentsForExpert(expert.id);
  const rows = assignments.map(a=>{
    const startup = getStartup(a.startupId);
    const challenge = getChallenge(a.challengeId);
    const pilot = getPilotForStartup(a.startupId);
    return `<tr>
      <td><strong>${esc(startup.name)}</strong></td>
      <td>${esc(challenge.title)}</td>
      <td>${startup.technologies.slice(0,2).map(t=>`<span class="chip">${esc(t)}</span>`).join(" ")}</td>
      <td>${statusBadge(startup.verification.status)}</td>
      <td>${pilot ? esc(pilot.stages[pilot.currentStage].name) : "Pre-Pilot"}</td>
      <td>${formatDate(a.assignedAt)}</td>
      <td>${formatDate(a.deadline)}</td>
      <td>${assignmentBadge(a.status)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="review-assignment" data-id="${a.id}">Review</button></td>
    </tr>`;
  }).join("");

  setMain(`
    ${pageHeader("Review Queue", "Startups and challenges assigned to you for independent technical evaluation.")}
    ${buildTable(["Startup","Challenge","Technology","DPIIT","Pilot Stage","Assigned","Deadline","Status","Actions"], rows)}
  `);
}

/* ===========================================================
   ================ CONFLICT OF INTEREST MODAL =================
   =========================================================== */
function openConflictModal(assignmentId){
  const a = getAssignment(assignmentId);
  const startup = getStartup(a.startupId);
  openModal({
    title:"Conflict of Interest Declaration", size:"",
    bodyHtml:`
      <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:14px;">Required before you can evaluate <strong>${esc(startup.name)}</strong>.</p>
      <div class="coi-box">
        <label>
          <input type="checkbox" id="coiCheckbox">
          <span>I confirm that I have no financial, professional, personal or other conflict of interest with this startup or evaluation.</span>
        </label>
      </div>
    `,
    footHtml:`
      <button class="btn btn-danger" id="coiDeclineBtn">Decline Assignment</button>
      <button class="btn btn-primary" id="coiContinueBtn" disabled>Declare & Continue</button>`
  });
  const checkbox = document.getElementById("coiCheckbox");
  const continueBtn = document.getElementById("coiContinueBtn");
  checkbox.addEventListener("change", ()=>{ continueBtn.disabled = !checkbox.checked; });
  continueBtn.addEventListener("click", ()=>{
    declareNoConflict(assignmentId);
    closeModal();
    toast("Conflict-of-interest declaration submitted.", "success");
    openAssignmentWorkspace(assignmentId);
  });
  document.getElementById("coiDeclineBtn").addEventListener("click", ()=>{
    closeModal();
    confirmDialog({
      title:"Decline this assignment?", message:`You will no longer be able to evaluate ${esc(startup.name)} for this challenge. An administrator will need to reassign it.`,
      confirmLabel:"Decline Assignment", danger:true,
      onConfirm:()=>{
        declineAssignment(assignmentId, "Expert declined at conflict-of-interest step");
        toast("Assignment declined.", "warn");
        navigateTo("exp-queue");
      }
    });
  });
}

/* Entry point for the "Review" button — routes to the right workspace */
function openAssignmentWorkspace(assignmentId){
  const a = getAssignment(assignmentId);
  if(!a) return;
  if(a.status === "Declined"){ toast("This assignment was declined.", "error"); return; }
  if(!getConflictDeclaration(assignmentId)){
    openConflictModal(assignmentId);
    return;
  }
  if(a.type === "Post-Pilot Technical Validation"){
    appState.expertAssignmentId = assignmentId;
    navigateTo("exp-pilotval");
  }else{
    appState.expertAssignmentId = assignmentId;
    evalUIState = {answers:{}, recommendation:null};
    navigateTo("exp-workspace");
  }
}

/* ===========================================================
   ================ PRE-PILOT EVALUATION WORKSPACE =============
   =========================================================== */
function renderExpertEvaluationWorkspace(){
  const assignmentId = appState.expertAssignmentId;
  const a = getAssignment(assignmentId);
  if(!a){ navigateTo("exp-queue"); return; }
  const startup = getStartup(a.startupId);
  const challenge = getChallenge(a.challengeId);
  const existing = getEvaluationForAssignment(assignmentId);

  setMain(`
    ${pageHeader("Technical Evaluation Workspace", `${esc(startup.name)} — ${esc(challenge.title)}`)}
    ${existing && existing.status==="Submitted" ? renderEvaluationReadOnly(existing, startup, challenge) : renderEvaluationEditable(a, startup, challenge, existing)}
  `);

  if(!existing || existing.status !== "Submitted"){
    wireEvaluationWorkspace(a, existing);
  }
}

function renderEvaluationReadOnly(ev, startup, challenge){
  return `
    <div class="locked-banner">🔒 This evaluation was submitted on ${formatDate(ev.submittedAt)} and is now read-only.</div>
    ${renderExpertAssessmentBody(ev, getAssignment(ev.assignmentId))}
    <div class="form-actions" style="justify-content:flex-start;margin-top:10px;">
      <button class="btn btn-ghost btn-sm" data-action="navigate" data-view="exp-queue">← Back to Review Queue</button>
    </div>`;
}

function renderEvaluationEditable(a, startup, challenge, existing){
  const scores = existing ? existing.scores : {technicalFeasibility:70, innovation:70, deploymentReadiness:70, scalability:70, teamCapability:70, evidenceQuality:70};
  evalUIState.answers = existing ? {...existing.answers} : {};
  evalUIState.recommendation = existing ? existing.recommendation : null;
  const evidence = getEvidenceForAssignment(a.id);
  const clarifications = getClarificationsForAssignment(a.id);

  return `
    <div class="eval-workspace">
      <div>
        <div class="eval-panel">
          <div class="eval-panel-title">Startup Profile</div>
          <div class="profile-head">
            <div class="profile-avatar">${startup.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>
            <div>
              <h2 style="font-size:17px;color:var(--navy-900);">${esc(startup.name)}</h2>
              <p class="muted" style="font-size:12.5px;margin-top:2px;">${esc(startup.hq)} · Founded ${formatDate(startup.founded)}</p>
              <div style="margin-top:6px;">${statusBadge(startup.verification.status)} <span class="chip">Team: ${startup.teamSize}</span> <span class="chip">Prior Pilot Score: ${startup.pilotScore}</span></div>
            </div>
          </div>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.6;margin:12px 0;">${esc(startup.description)}</p>
          <div class="kv-grid">
            <div><div class="kv-label">DPIIT Recognition</div>${esc(startup.dpiitNumber)}</div>
            <div><div class="kv-label">Technology</div>${startup.technologies.join(", ")}</div>
          </div>
          <div style="margin-top:12px;">
            <div class="kv-label" style="margin-bottom:6px;">Previous Government Pilots</div>
            ${startup.previousPilots.length ? startup.previousPilots.map(p=>`<div class="card-row" style="font-size:12.5px;padding:6px 0;"><span>${esc(p.name)}</span><span class="muted">${esc(p.outcome)}</span></div>`).join("") : `<span class="muted" style="font-size:12.5px;">No previous pilots on record.</span>`}
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-top:14px;"><strong>Challenge:</strong> ${esc(challenge.description)}</p>
        </div>

        <div class="eval-panel">
          <div class="eval-panel-title">Technical Evidence Review</div>
          ${evidence.length ? evidence.map(ev=>renderEvidenceItem(ev)).join("") : emptyState("No evidence submitted yet")}
          <div style="margin-top:10px;">
            <div class="form-field"><label>Request Clarification from Startup</label>
              <textarea id="clarificationInput" placeholder="e.g. Please provide testing methodology and dataset details."></textarea>
            </div>
            <div class="form-actions" style="justify-content:flex-start;">
              <button class="btn btn-secondary btn-sm" data-action="request-clarification" data-id="${a.id}">Send Request</button>
            </div>
          </div>
          ${clarifications.length ? `
          <div style="margin-top:12px;">
            <div class="kv-label" style="margin-bottom:6px;">Clarification History</div>
            ${clarifications.map(c=>`
              <div class="card-row" style="font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--border);">
                <span>${esc(c.question)}</span>
                ${c.status==="Responded" ? `<span class="badge badge-success">Responded — ${esc(c.response.documentName)}</span>` : `<span class="badge badge-warning">Pending</span>`}
              </div>`).join("")}
          </div>` : ""}
        </div>
      </div>

      <div>
        <div class="eval-panel">
          <div class="eval-panel-title">Expert Evaluation Score <span class="chip">0–100</span></div>
          ${EVAL_CRITERIA.map(c=>`
            <div class="score-row">
              <div class="score-row-head">
                <span>${c.label} <span class="weight-tag">(${Math.round(c.weight*100)}%)</span></span>
                <span class="score-val" id="scoreVal-${c.key}">${scores[c.key]}</span>
              </div>
              <input type="range" min="0" max="100" value="${scores[c.key]}" id="score-${c.key}" data-weight="${c.weight}">
            </div>`).join("")}
          <div class="overall-score-box">
            <div class="osb-value" id="overallScoreVal">${computeOverallScore(scores)}</div>
            <div class="osb-label">Overall Expert Score</div>
            <div class="osb-note">Prototype Evaluation Score — configurable by program authority. Not an official Maharashtra Government scoring standard.</div>
          </div>
        </div>

        <div class="eval-panel">
          <div class="eval-panel-title">Technical Assessment Questions</div>
          ${Object.entries(TECH_QUESTIONS).map(([key,group])=>`
            <div class="question-group">
              <div class="question-group-title">${esc(group.label)}</div>
              ${group.items.map(q=>`
                <div class="question-row">
                  <p>${esc(q.text)}</p>
                  <div class="answer-pills" data-qid="${q.id}">
                    ${ANSWER_OPTIONS.map(opt=>`<button type="button" class="answer-pill${evalUIState.answers[q.id]===opt ? " selected-"+opt.toLowerCase() : ""}" data-qid="${q.id}" data-value="${opt}">${opt}</button>`).join("")}
                  </div>
                </div>`).join("")}
            </div>`).join("")}
        </div>

        <div class="eval-panel">
          <div class="eval-panel-title">Expert Recommendation</div>
          <div class="recommend-options">
            <div class="recommend-card${evalUIState.recommendation==="Recommend"?" selected":""}" data-rec="Recommend">
              <h5>✅ Recommend</h5><p>Suitable for PoC / Pilot.</p>
            </div>
            <div class="recommend-card${evalUIState.recommendation==="Recommend with Conditions"?" selected":""}" data-rec="Recommend with Conditions">
              <h5>⚠ Recommend with Conditions</h5><p>Suitable only after specified conditions are satisfied.</p>
            </div>
            <div class="recommend-card${evalUIState.recommendation==="Do Not Recommend"?" selected":""}" data-rec="Do Not Recommend">
              <h5>❌ Do Not Recommend</h5><p>Insufficient technical evidence or feasibility.</p>
            </div>
          </div>
          <div class="form-field" style="margin-top:14px;"><label>Conditions (one per line, if applicable)</label>
            <textarea id="conditionsInput" placeholder="e.g. Complete field testing for 60 days.">${existing && existing.conditions ? existing.conditions.join("\n") : ""}</textarea>
          </div>
          <div class="form-field" style="margin-top:10px;"><label>Justification / Comments</label>
            <textarea id="commentsInput" placeholder="Explain the basis for this recommendation…">${existing ? esc(existing.comments) : ""}</textarea>
          </div>
          <div class="form-actions" style="justify-content:flex-start;margin-top:12px;">
            <button class="btn btn-primary" id="submitEvalBtn">Submit Technical Evaluation</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEvidenceItem(ev){
  const statusOptions = ["Pending Review","Verified","Needs Clarification","Rejected"];
  return `
    <div class="evidence-item" id="evidenceRow-${ev.id}">
      <div class="evidence-item-head">
        <strong style="font-size:13px;">${esc(ev.evidenceName)}</strong>
        ${statusBadge(ev.status==="Pending Review"?"Pending":ev.status==="Needs Clarification"?"Submitted":ev.status)}
      </div>
      <div class="evidence-claim"><strong>Startup Claim:</strong> ${esc(ev.claim)}</div>
      <div class="evidence-values">
        <span>Claimed: <b>${esc(ev.claimedValue)}</b></span>
        <span>Verified: <b>${ev.verifiedValue ? esc(ev.verifiedValue) : "—"}</b></span>
      </div>
      <div class="form-grid">
        <div class="form-field"><label>Verified Value</label><input type="text" id="verifiedVal-${ev.id}" value="${ev.verifiedValue ? esc(ev.verifiedValue) : ""}" placeholder="e.g. 87.4%"></div>
        <div class="form-field"><label>Status</label>
          <select id="verifiedStatus-${ev.id}">
            ${statusOptions.map(s=>`<option value="${s}" ${ev.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full"><label>Comment</label><textarea id="verifiedComment-${ev.id}" placeholder="Please provide testing methodology and dataset details.">${esc(ev.comment||"")}</textarea></div>
      </div>
      <div class="evidence-actions">
        <button class="btn btn-secondary btn-sm" data-action="verify-evidence" data-id="${ev.id}">Save Evidence Review</button>
      </div>
    </div>`;
}

function wireEvaluationWorkspace(a, existing){
  EVAL_CRITERIA.forEach(c=>{
    const input = document.getElementById(`score-${c.key}`);
    if(!input) return;
    input.addEventListener("input", ()=>{
      document.getElementById(`scoreVal-${c.key}`).textContent = input.value;
      recalcOverallScore();
    });
  });
  recalcOverallScore();

  document.querySelectorAll(".answer-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const qid = btn.dataset.qid, value = btn.dataset.value;
      evalUIState.answers[qid] = value;
      document.querySelectorAll(`.answer-pill[data-qid="${qid}"]`).forEach(b=>{
        b.classList.remove("selected-yes","selected-partially","selected-no");
      });
      btn.classList.add(`selected-${value.toLowerCase()}`);
    });
  });

  document.querySelectorAll(".recommend-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      evalUIState.recommendation = card.dataset.rec;
      document.querySelectorAll(".recommend-card").forEach(c=>c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });

  const submitBtn = document.getElementById("submitEvalBtn");
  if(submitBtn) submitBtn.addEventListener("click", ()=>submitEvaluationFromUI(a.id));
}

function recalcOverallScore(){
  const scores = {};
  EVAL_CRITERIA.forEach(c=>{
    const input = document.getElementById(`score-${c.key}`);
    scores[c.key] = input ? Number(input.value) : 0;
  });
  const box = document.getElementById("overallScoreVal");
  if(box) box.textContent = computeOverallScore(scores);
}

function verifyEvidenceFromUI(evidenceId){
  const verifiedValue = document.getElementById(`verifiedVal-${evidenceId}`).value.trim();
  const status = document.getElementById(`verifiedStatus-${evidenceId}`).value;
  const comment = document.getElementById(`verifiedComment-${evidenceId}`).value.trim();
  const result = reviewEvidence(evidenceId, {status, verifiedValue, comment});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Evidence marked ${status}.`, "success");
  const row = document.getElementById(`evidenceRow-${evidenceId}`);
  if(row) row.outerHTML = renderEvidenceItem(result.evidence);
  const newRow = document.getElementById(`evidenceRow-${evidenceId}`);
  if(newRow){
    newRow.querySelector('[data-action="verify-evidence"]').addEventListener("click", ()=>verifyEvidenceFromUI(evidenceId));
  }
}

function requestClarificationFromUI(assignmentId){
  const input = document.getElementById("clarificationInput");
  const result = requestClarification(assignmentId, input.value);
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Clarification request sent to the startup.", "success");
  renderExpertEvaluationWorkspace();
}

function submitEvaluationFromUI(assignmentId){
  const scores = {};
  EVAL_CRITERIA.forEach(c=>{
    scores[c.key] = Number(document.getElementById(`score-${c.key}`).value);
  });
  const recommendation = evalUIState.recommendation;
  const conditions = document.getElementById("conditionsInput").value.split("\n").map(s=>s.trim()).filter(Boolean);
  const comments = document.getElementById("commentsInput").value.trim();

  const result = submitEvaluation(assignmentId, {scores, answers: evalUIState.answers, recommendation, conditions, comments});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Evaluation submitted — Overall Score ${result.evaluation.overallScore}/100.`, "success");
  navigateTo("exp-queue");
}

/* ===========================================================
   ================== POST-PILOT VALIDATION =====================
   =========================================================== */
function renderExpertPilotValidation(){
  const assignmentId = appState.expertAssignmentId;
  const a = getAssignment(assignmentId);
  if(!a){ navigateTo("exp-queue"); return; }
  const startup = getStartup(a.startupId);
  const challenge = getChallenge(a.challengeId);
  const pilot = getPilotForStartup(a.startupId);
  let validation = getPilotValidationForAssignment(assignmentId);
  if(!validation){
    const result = startPilotValidation(assignmentId);
    validation = result.validation;
  }

  setMain(`
    ${pageHeader("Pilot Validation", `${esc(startup.name)} — ${esc(challenge.title)}`)}
    <div class="eval-panel">
      <div class="kv-grid">
        <div><div class="kv-label">Pilot Location</div>${esc(challenge.location||"—")}</div>
        <div><div class="kv-label">Pilot Duration</div>${esc(challenge.duration||"—")}</div>
        <div><div class="kv-label">Pilot Stage</div>${pilot ? esc(pilot.stages[pilot.currentStage].name) : "—"}</div>
        <div><div class="kv-label">Validation Criteria</div>${esc(challenge.validationCriteria||"—")}</div>
      </div>
    </div>
    ${validation.status==="Submitted" ? renderPilotValidationReadOnly(validation, startup) : renderPilotValidationEditable(validation, startup)}
  `);

  if(validation.status !== "Submitted"){
    wirePilotValidationWorkspace(validation);
  }
}

function metricStatusIcon(status){
  return status==="Pass" ? "✅" : status==="Fail" ? "❌" : status==="Conditional" ? "⚠" : "—";
}

function renderPilotValidationEditable(v, startup){
  return `
    <div class="eval-panel">
      <div class="eval-panel-title">Target Metrics</div>
      ${v.metrics.map((m,i)=>`
        <div class="metric-card" id="metricCard-${i}">
          <div class="metric-card-head">
            <strong style="font-size:13.5px;">${esc(m.name)}</strong>
            <span>${metricStatusIcon(m.status)} ${statusBadge(m.status==="Pending"?"Submitted":m.status==="Pass"?"Approved":m.status==="Fail"?"Rejected":"Pending")}</span>
          </div>
          <div class="metric-targets"><span>Target: <b>${esc(m.target)}</b></span><span>Actual: <b>${m.actual ? esc(m.actual) : "Not yet recorded"}</b></span></div>
          <div class="metric-grid">
            <div class="form-field"><label>Actual Value</label><input type="text" id="metricActual-${i}" value="${esc(m.actual||"")}" placeholder="e.g. 87.4%"></div>
            <div class="form-field"><label>Status</label>
              <select id="metricStatus-${i}">
                <option value="Pending" ${m.status==="Pending"?"selected":""}>Pending</option>
                <option value="Pass" ${m.status==="Pass"?"selected":""}>Pass</option>
                <option value="Conditional" ${m.status==="Conditional"?"selected":""}>Conditional</option>
                <option value="Fail" ${m.status==="Fail"?"selected":""}>Fail</option>
              </select>
            </div>
            <div class="form-field"><label>Evidence Reference</label><input type="text" id="metricEvidence-${i}" value="${esc(m.evidence||"")}" placeholder="e.g. field_test_report.pdf"></div>
          </div>
          <div class="form-field" style="margin-top:8px;"><label>Comment</label><textarea id="metricComment-${i}" placeholder="Notes on this metric…">${esc(m.comment||"")}</textarea></div>
          <div class="form-actions" style="justify-content:flex-start;">
            <button class="btn btn-secondary btn-sm" data-action="validate-pilot-metric" data-id="${v.id}" data-index="${i}">Save Metric</button>
          </div>
        </div>`).join("")}
    </div>
    <div class="eval-panel">
      <div class="eval-panel-title">Expert Validation Result</div>
      <div class="form-field"><label>Recommendation</label>
        <select id="pvRecommendation">
          <option value="">Select…</option>
          <option value="Recommend" ${v.recommendation==="Recommend"?"selected":""}>Recommend for Government Approval</option>
          <option value="Recommend with Conditions" ${v.recommendation==="Recommend with Conditions"?"selected":""}>Recommend with Conditions</option>
          <option value="Do Not Recommend" ${v.recommendation==="Do Not Recommend"?"selected":""}>Do Not Recommend</option>
        </select>
      </div>
      <div class="form-field" style="margin-top:10px;"><label>Comments</label><textarea id="pvComments" placeholder="Summarise pilot performance and any conditions…">${esc(v.comments||"")}</textarea></div>
      <div class="form-actions" style="justify-content:flex-start;margin-top:12px;">
        <button class="btn btn-primary" id="submitPilotValBtn">Submit Technical Validation</button>
      </div>
    </div>`;
}

function renderPilotValidationReadOnly(v, startup){
  return `
    <div class="locked-banner">🔒 This pilot validation was submitted on ${formatDate(v.submittedAt)} and is now read-only.</div>
    <div class="eval-panel assessment-readonly">
      <div class="eval-panel-title">Target Metrics</div>
      ${buildTable(["Metric","Target","Actual","Status"], v.metrics.map(m=>`
        <tr><td>${esc(m.name)}</td><td>${esc(m.target)}</td><td>${esc(m.actual)}</td><td>${metricStatusIcon(m.status)} ${esc(m.status)}</td></tr>`).join(""))}
      <div class="kv-grid" style="margin-top:16px;">
        <div><div class="kv-label">Pilot Performance</div>${v.overallResult}%</div>
        <div><div class="kv-label">Evidence Completeness</div>${v.evidenceCompleteness}%</div>
        <div><div class="kv-label">Recommendation</div>${esc(v.recommendation)}</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:12px;">${esc(v.comments)}</p>
    </div>
    <div class="form-actions" style="justify-content:flex-start;">
      <button class="btn btn-ghost btn-sm" data-action="navigate" data-view="exp-queue">← Back to Review Queue</button>
    </div>`;
}

function wirePilotValidationWorkspace(v){
  const submitBtn = document.getElementById("submitPilotValBtn");
  if(submitBtn) submitBtn.addEventListener("click", ()=>submitPilotValidationFromUI(v.id));
}

function validatePilotMetricFromUI(validationId, index){
  const actual = document.getElementById(`metricActual-${index}`).value.trim();
  const status = document.getElementById(`metricStatus-${index}`).value;
  const evidence = document.getElementById(`metricEvidence-${index}`).value.trim();
  const comment = document.getElementById(`metricComment-${index}`).value.trim();
  const result = updatePilotMetric(validationId, index, {actual, status, evidence, comment});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Metric saved.", "success");
  renderExpertPilotValidation();
}

function submitPilotValidationFromUI(validationId){
  const recommendation = document.getElementById("pvRecommendation").value;
  const comments = document.getElementById("pvComments").value.trim();
  const result = submitPilotValidation(validationId, {recommendation, comments});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast(`Pilot validation submitted — ${result.validation.overallResult}% pilot performance.`, "success");
  navigateTo("exp-queue");
}

/* ===========================================================
   ============= SHARED: READ-ONLY EXPERT ASSESSMENT ============
   (used by Government + Startup dashboards)
   =========================================================== */
function renderExpertAssessmentBody(ev, a){
  return `
    <div class="assessment-readonly">
      <div class="overall-score-box" style="max-width:260px;">
        <div class="osb-value">${ev.overallScore}</div>
        <div class="osb-label">Overall Expert Score</div>
      </div>
      <div class="kv-grid" style="margin-top:16px;">
        ${EVAL_CRITERIA.map(c=>`<div><div class="kv-label">${c.label}</div>${ev.scores[c.key]}</div>`).join("")}
      </div>
      <div class="kv-grid" style="margin-top:14px;">
        <div><div class="kv-label">Recommendation</div>${esc(ev.recommendation)}</div>
        <div><div class="kv-label">Submitted</div>${formatDate(ev.submittedAt)}</div>
      </div>
      ${ev.conditions && ev.conditions.length ? `<div style="margin-top:10px;"><div class="kv-label">Conditions</div><ul class="condition-list">${ev.conditions.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
      ${ev.comments ? `<p style="font-size:13px;color:var(--text-muted);margin-top:12px;">${esc(ev.comments)}</p>` : ""}
    </div>`;
}

function openExpertAssessmentDrawer(assignmentId){
  const a = getAssignment(assignmentId);
  if(!a) return;
  const startup = getStartup(a.startupId);
  const challenge = getChallenge(a.challengeId);
  const ev = getEvaluationForAssignment(assignmentId);
  const pv = getPilotValidationForAssignment(assignmentId);
  const expert = getExpert(a.expertId);

  let body = `
    <div style="margin-bottom:14px;">${assignmentBadge(a.status)} <span class="chip">${esc(a.type)}</span></div>
    <div class="kv-grid" style="margin-bottom:16px;">
      <div><div class="kv-label">Startup</div>${esc(startup.name)}</div>
      <div><div class="kv-label">Challenge</div>${esc(challenge.title)}</div>
      <div><div class="kv-label">Expert</div>${esc(expert.name)}</div>
      <div><div class="kv-label">Domain</div>${esc(expert.domain)}</div>
    </div>`;

  if(ev && ev.status==="Submitted"){
    body += renderExpertAssessmentBody(ev, a);
  }else if(pv && pv.status==="Submitted"){
    body += `
      <div class="assessment-readonly">
        ${buildTable(["Metric","Target","Actual","Status"], pv.metrics.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.target)}</td><td>${esc(m.actual)}</td><td>${metricStatusIcon(m.status)} ${esc(m.status)}</td></tr>`).join(""))}
        <div class="kv-grid" style="margin-top:14px;">
          <div><div class="kv-label">Pilot Performance</div>${pv.overallResult}%</div>
          <div><div class="kv-label">Recommendation</div>${esc(pv.recommendation)}</div>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-top:10px;">${esc(pv.comments)}</p>
      </div>`;
  }else{
    body += emptyState("Evaluation not yet completed", "The expert has not submitted a technical assessment for this assignment.");
  }

  openDrawer({title:"Expert Assessment", subtitle:`${a.id}`, bodyHtml: body});
}

/* ===========================================================
   ============= GOVERNMENT INTEGRATION: EXPERT REVIEWS =========
   =========================================================== */
function renderGovExpertReviews(){
  const rows = [];
  DB.challenges.forEach(c=>{
    c.shortlist.forEach(sid=>{
      const startup = getStartup(sid);
      const a = latestAssignmentFor(sid, c.id);
      rows.push({challenge:c, startup, assignment:a});
    });
  });

  const body = rows.map(r=>`
    <tr>
      <td><strong>${esc(r.startup.name)}</strong></td>
      <td>${esc(r.challenge.title)}</td>
      <td>${r.assignment ? esc(r.assignment.type) : "—"}</td>
      <td>${r.assignment ? assignmentBadge(r.assignment.status) : `<span class="badge badge-neutral">Not Assigned</span>`}</td>
      <td class="table-actions">${r.assignment ? `<button class="btn btn-ghost btn-sm" data-action="view-expert-assessment" data-id="${r.assignment.id}">View Expert Assessment</button>` : `<span class="faint" style="font-size:12px;">Assign via Admin → Experts</span>`}</td>
    </tr>`).join("");

  setMain(`
    ${pageHeader("Expert Reviews", "Independent technical evaluation status for every shortlisted startup.")}
    ${buildTable(["Startup","Challenge","Evaluation Type","Expert Status","Actions"], body)}
  `);
}

/* ===========================================================
   ============== STARTUP INTEGRATION: EXPERT REVIEW ============
   =========================================================== */
function renderStartupExpertReview(){
  const s = currentStartup();
  const assignments = assignmentsForStartup(s.id);

  setMain(`
    ${pageHeader("Expert Review", "Independent technical evaluation of your solution by a domain expert.")}
    ${assignments.length ? assignments.map(a=>renderStartupAssignmentCard(a)).join("") : emptyState("No expert review yet", "You'll see this once a government department shortlists your solution and an expert is assigned.")}
  `);
}

function renderStartupAssignmentCard(a){
  const challenge = getChallenge(a.challengeId);
  const ev = getEvaluationForAssignment(a.id);
  const pv = getPilotValidationForAssignment(a.id);
  const clarifications = getClarificationsForAssignment(a.id).filter(c=>c.status==="Pending");

  return `
    <div class="card section-block">
      <div class="card-row" style="margin-bottom:10px;">
        <div><div class="card-title">${esc(challenge.title)}</div><div class="card-sub">${esc(a.type)}</div></div>
        ${assignmentBadge(a.status)}
      </div>
      ${ev && ev.status==="Submitted" ? `
        <div class="kv-grid">
          <div><div class="kv-label">Overall Score</div>${ev.overallScore} / 100</div>
          <div><div class="kv-label">Recommendation</div>${esc(ev.recommendation)}</div>
        </div>
        ${ev.conditions && ev.conditions.length ? `<div style="margin-top:10px;"><div class="kv-label">Conditions</div><ul class="condition-list">${ev.conditions.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
      ` : pv && pv.status==="Submitted" ? `
        <div class="kv-grid">
          <div><div class="kv-label">Pilot Performance</div>${pv.overallResult}%</div>
          <div><div class="kv-label">Recommendation</div>${esc(pv.recommendation)}</div>
        </div>
      ` : `<p class="muted" style="font-size:13px;">Technical Evaluation — In Progress</p>`}

      ${clarifications.length ? clarifications.map(c=>`
        <div class="card" style="margin-top:14px;border-color:var(--warning-600);">
          <div class="card-title" style="margin-bottom:6px;">Expert Request</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">${esc(c.question)}</p>
          <div class="form-grid">
            <div class="form-field"><label>Upload Document</label><input type="text" id="clarifyDoc-${c.id}" placeholder="e.g. methodology_report.pdf"></div>
          </div>
          <div class="form-actions" style="justify-content:flex-start;">
            <button class="btn btn-primary btn-sm" data-action="respond-clarification" data-id="${c.id}">Submit Response</button>
          </div>
        </div>`).join("") : ""}
    </div>`;
}

function respondToClarificationFromUI(clarificationId){
  const input = document.getElementById(`clarifyDoc-${clarificationId}`);
  const documentName = input ? input.value.trim() : "";
  if(!documentName){ toast("Enter a document name to upload.", "error"); return; }
  const result = respondToClarification(clarificationId, {documentName});
  if(!result.ok){ toast(result.message, "error"); return; }
  toast("Response submitted to the expert.", "success");
  renderStartupExpertReview();
}

/* ===========================================================
   ==================== ADMIN: EXPERTS =========================
   =========================================================== */
function renderAdminExperts(){
  const expertRows = DB.experts.map(e=>{
    const assignments = getAssignmentsForExpert(e.id);
    return `<tr>
      <td><strong>${esc(e.name)}</strong></td>
      <td>${esc(e.domain)}</td>
      <td>${e.experience} yrs</td>
      <td>${esc(e.organization)}</td>
      <td>${statusBadge("Approved")} ${esc(e.status)}</td>
      <td>${assignments.length}</td>
    </tr>`;
  }).join("");

  const assignmentRows = DB.expertAssignments.map(a=>{
    const startup = getStartup(a.startupId);
    const challenge = getChallenge(a.challengeId);
    const expert = getExpert(a.expertId);
    return `<tr>
      <td>${esc(startup.name)}</td><td>${esc(challenge.title)}</td><td>${esc(expert.name)}</td>
      <td>${esc(a.type)}</td><td>${formatDate(a.deadline)}</td><td>${assignmentBadge(a.status)}</td>
      <td class="table-actions"><button class="btn btn-ghost btn-sm" data-action="view-expert-assessment" data-id="${a.id}">View</button></td>
    </tr>`;
  }).join("");

  setMain(`
    ${pageHeader("Experts", "Manage the panel of independent technical experts and their assignments.")}
    <div class="section-head"><h2>Expert Panel</h2><button class="btn btn-primary" data-action="open-assign-expert">+ Assign Expert</button></div>
    ${buildTable(["Name","Domain","Experience","Organisation","Status","Assignments"], expertRows)}
    <div class="section-block"></div>
    <div class="section-head"><h2>All Assignments</h2></div>
    ${buildTable(["Startup","Challenge","Expert","Type","Deadline","Status","Actions"], assignmentRows)}
  `);
}

function openAssignExpertModal(){
  openModal({
    title:"Assign Expert", size:"lg",
    bodyHtml:`
      <form id="assignExpertForm" novalidate>
        <div class="form-grid">
          <div class="form-field"><label>Startup <span class="req">*</span></label>
            <select name="startupId">${DB.startups.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
          <div class="form-field"><label>Challenge <span class="req">*</span></label>
            <select name="challengeId">${DB.challenges.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join("")}</select></div>
          <div class="form-field"><label>Expert <span class="req">*</span></label>
            <select name="expertId">${DB.experts.map(e=>`<option value="${e.id}">${esc(e.name)} — ${esc(e.domain)}</option>`).join("")}</select></div>
          <div class="form-field"><label>Evaluation Type <span class="req">*</span></label>
            <select name="type">
              <option value="Pre-Pilot Technical Evaluation">Pre-Pilot Technical Evaluation</option>
              <option value="Post-Pilot Technical Validation">Post-Pilot Technical Validation</option>
            </select></div>
          <div class="form-field"><label>Deadline</label><input type="date" name="deadline"></div>
        </div>
      </form>`,
    footHtml:`<button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" id="submitAssignExpertBtn">Assign Evaluation</button>`
  });
  document.getElementById("submitAssignExpertBtn").addEventListener("click", ()=>{
    const form = document.getElementById("assignExpertForm");
    const data = Object.fromEntries(new FormData(form).entries());
    const result = assignExpert(data);
    if(!result.ok){ toast(result.message, "error"); return; }
    closeModal();
    toast(`Assigned ${getExpert(data.expertId).name} to ${getStartup(data.startupId).name}.`, "success");
    renderAdminExperts();
  });
}
