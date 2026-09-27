/* =========================================================
   GovInnovate — public.js
   General User / Beneficiary module (5th actor), Feedback
   Engine, Government Decision Workspace, Procurement Handoff
   and Scale-Up. This file owns the data model + business
   rules; public-ui.js owns rendering only.

   Section references are to the SIH 2026 PS-136 problem
   statement already included in this project
   (documents/136.pdf): §38-42 General User / Feedback,
   §43-44 Pilot Lifecycle, §47 Procurement Handoff,
   §48-49 RAG / Knowledge Engine.
   ========================================================= */

/* ---------------------------------------------------------
   Section 40 — Feedback question set (fixed, matches brief)
   --------------------------------------------------------- */
const FEEDBACK_QUESTIONS = [
  {id:"easyToUse", text:"Was it easy to use?"},
  {id:"reliable", text:"Was the service reliable?"},
  {id:"solvedProblem", text:"Did it solve the intended problem?"},
  {id:"responseTime", text:"Was response time acceptable?"}
];
const FEEDBACK_ANSWER_OPTIONS = ["Yes","Partially","No"];
const ISSUE_TYPES = ["Technical Problem","Service Unavailable","Incorrect Result","Accessibility Problem","Slow Response","Other"];

/* ---------------------------------------------------------
   Public eligibility — role security (Section 10 of brief)
   A pilot becomes visible to the public once it has reached
   Active Micro-Pilot or later (i.e. something is actually
   running that a citizen/beneficiary could experience).
   --------------------------------------------------------- */
function isPilotPublicEligible(pilot){
  return pilot.currentStage >= 2; // 0=PoC,1=Sandbox,2=Active Micro-Pilot,3=Validation,4=Scale-Up Procurement
}
function getPublicEligiblePilots(){
  return DB.pilots.filter(isPilotPublicEligible);
}

/* Whitelisted view of a pilot for the public module — never expose
   budget, DPIIT numbers, risk scores, internal evidence or expert scores. */
function getPublicPilotView(pilotId){
  const pilot = getPilot(pilotId);
  if(!pilot || !isPilotPublicEligible(pilot)) return null;
  const challenge = getChallenge(pilot.challengeId);
  const startup = getStartup(pilot.startupId);
  const stage = pilot.stages[pilot.currentStage];
  return {
    pilotId: pilot.id,
    solution: startup ? startup.name : "—",
    startupDescription: startup ? startup.description : "",
    department: pilot.department,
    problemBeingSolved: challenge ? challenge.description : "",
    challengeTitle: challenge ? challenge.title : pilot.title,
    pilotLocation: challenge ? challenge.location : "—",
    pilotStatus: stage.name,
    pilotStatusState: stage.status
  };
}

/* ---------------------------------------------------------
   Section 41 — Feedback Analysis Engine (DEMO classification)
   This is a simple keyword/rule based classifier, clearly
   NOT production NLP, as required by the brief.
   --------------------------------------------------------- */
const SUGGESTION_KEYWORDS = ["suggest","should add","could add","add a","wish","would be nice","it would help","please add","recommend adding","feature request"];
const NEGATIVE_KEYWORDS = ["fail","broke","broken","delay","delayed","slow","crash","error","did not work","didn't work","not working","poor","bad experience","unreliable","unresponsive"];
const POSITIVE_KEYWORDS = ["great","good","excellent","useful","easy","helpful","smooth","fast","reliable","satisfied","works well"];

function classifyFeedback({rating, comment, issueType}){
  const text = (comment||"").toLowerCase();

  // Section 41: Issue > Suggestion > sentiment. An explicit issue report
  // always surfaces as "Issue" so it cannot be buried under a rating.
  if(issueType && issueType !== "" && issueType !== "None") return "Issue";
  if(SUGGESTION_KEYWORDS.some(k=>text.includes(k))) return "Suggestion";
  if(NEGATIVE_KEYWORDS.some(k=>text.includes(k)) || rating <= 2) return "Negative";
  if(POSITIVE_KEYWORDS.some(k=>text.includes(k)) || rating >= 4) return "Positive";
  return rating === 3 ? "Neutral" : "Positive";
}

function submitFeedback(pilotId, {rating, answers, comment, issueType}){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  if(!isPilotPublicEligible(pilot)) return {ok:false, message:"This pilot is not yet open for public feedback."};
  const r = Number(rating);
  if(!r || r < 1 || r > 5) return {ok:false, message:"Please select a rating from 1 to 5."};

  const classification = classifyFeedback({rating:r, comment, issueType});
  const record = {
    id: genId("FB"),
    pilotId,
    rating: r,
    answers: answers || {},
    comment: (comment||"").trim(),
    issueType: issueType || "None",
    classification,
    createdAt: new Date().toISOString()
  };
  DB.feedback.unshift(record);

  const challenge = getChallenge(pilot.challengeId);
  addAuditLog(`Public feedback received — ${challenge ? challenge.title : pilot.title} (${pilot.id}), rating ${r}/5`);
  addNotification(`New user feedback received for ${challenge ? challenge.title : pilot.title}.`);
  persist();
  return {ok:true, feedback:record};
}

function getFeedbackForPilot(pilotId){
  return DB.feedback.filter(f=>f.pilotId===pilotId);
}

/* Compute real statistics from stored feedback — no invented numbers. */
function computeFeedbackStats(pilotId=null){
  const rows = pilotId ? getFeedbackForPilot(pilotId) : DB.feedback;
  const total = rows.length;
  if(total === 0){
    return {
      total:0, avgRating:0, satisfactionPct:0,
      classificationCounts:{Positive:0, Negative:0, Neutral:0, Suggestion:0, Issue:0},
      issueTypeCounts:{}, suggestions:[], issues:[], trend:[]
    };
  }
  const avgRating = Math.round((rows.reduce((s,f)=>s+f.rating,0) / total) * 10) / 10;
  const satisfactionPct = Math.round((rows.filter(f=>f.rating>=4).length / total) * 100);

  const classificationCounts = {Positive:0, Negative:0, Neutral:0, Suggestion:0, Issue:0};
  rows.forEach(f=>{ classificationCounts[f.classification] = (classificationCounts[f.classification]||0) + 1; });

  const issueTypeCounts = {};
  rows.filter(f=>f.issueType && f.issueType !== "None").forEach(f=>{
    issueTypeCounts[f.issueType] = (issueTypeCounts[f.issueType]||0) + 1;
  });

  const suggestions = rows.filter(f=>f.classification==="Suggestion" && f.comment).map(f=>f.comment);
  const issues = rows.filter(f=>f.classification==="Issue").map(f=>({issueType:f.issueType, comment:f.comment, pilotId:f.pilotId, createdAt:f.createdAt}));

  // Simple trend: feedback count grouped by calendar day.
  const trendMap = {};
  rows.forEach(f=>{
    const day = f.createdAt.slice(0,10);
    trendMap[day] = (trendMap[day]||0) + 1;
  });
  const trend = Object.keys(trendMap).sort().map(day=>({day, count:trendMap[day]}));

  return {total, avgRating, satisfactionPct, classificationCounts, issueTypeCounts, suggestions, issues, trend};
}

function getFeedbackByPilotBreakdown(){
  const pilotIds = Array.from(new Set(DB.feedback.map(f=>f.pilotId)));
  return pilotIds.map(pid=>{
    const pilot = getPilot(pid);
    const challenge = pilot ? getChallenge(pilot.challengeId) : null;
    return {pilotId:pid, pilotTitle: pilot ? pilot.title : pid, challengeTitle: challenge ? challenge.title : "—", stats: computeFeedbackStats(pid)};
  });
}

/* ---------------------------------------------------------
   Part 2 — Government Decision Workspace (Section 62 —
   five evidence layers feed a single Government decision;
   AI/Expert can never make this call).
   --------------------------------------------------------- */
const GOV_DECISION_OPTIONS = [
  {key:"APPROVE FOR PROCUREMENT", label:"Approve for Procurement", desc:"Solution is ready to move into the applicable procurement channel."},
  {key:"APPROVE WITH CONDITIONS", label:"Approve with Conditions", desc:"Approved, subject to conditions being satisfied before handoff."},
  {key:"REQUEST IMPROVEMENT", label:"Request Improvement", desc:"Send back for further pilot iteration before reconsideration."},
  {key:"DO NOT PROCEED", label:"Do Not Proceed", desc:"Solution does not proceed to procurement."}
];

/* Assembles the five evidence layers described in the brief for a
   single pilot, read-only — this does not decide anything itself. */
function getDecisionEvidenceBundle(pilotId){
  const pilot = getPilot(pilotId);
  if(!pilot) return null;
  const challenge = getChallenge(pilot.challengeId);
  const startup = getStartup(pilot.startupId);

  const prePilotAssignment = latestAssignmentFor(pilot.startupId, pilot.challengeId);
  const evaluation = prePilotAssignment ? getEvaluationForAssignment(prePilotAssignment.id) : null;
  const evidence = prePilotAssignment ? getEvidenceForAssignment(prePilotAssignment.id) : [];

  const postPilotValidation = DB.pilotValidations.find(v=>v.pilotId===pilotId)
    || (prePilotAssignment ? getPilotValidationForAssignment(prePilotAssignment.id) : null);

  const risk = DB.riskAssessments.find(r=>r.pilotId===pilotId) || null;
  const milestones = getMilestonesForPilot(pilotId);
  const costReleased = milestones.filter(m=>m.paymentStatus==="Released").reduce((s,m)=>s+m.paymentAmount,0);
  const costTotal = milestones.reduce((s,m)=>s+m.paymentAmount,0);

  const feedbackStats = computeFeedbackStats(pilotId);
  const documents = DB.documents.filter(d=>d.challengeId===pilot.challengeId || d.pilotId===pilotId);

  return {
    pilot, challenge, startup,
    technicalEvidence: {items: evidence, count: evidence.length,
      verified: evidence.filter(e=>e.status==="Verified").length},
    pilotMetrics: postPilotValidation ? postPilotValidation.metrics : [],
    expertValidation: {
      preEvaluation: evaluation,
      postValidation: postPilotValidation
    },
    userFeedback: feedbackStats,
    risk,
    cost: {total: costTotal, released: costReleased, budget: challenge ? challenge.budget : null},
    issues: feedbackStats.issues,
    documents
  };
}

function makeGovernmentDecision(pilotId, {decision, reason}){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  if(!GOV_DECISION_OPTIONS.some(o=>o.key===decision)) return {ok:false, message:"Select a decision option."};
  if(!reason || !reason.trim()) return {ok:false, message:"A decision reason is required."};

  const record = {
    id: genId("GD"), pilotId,
    decisionMaker: DB.currentUser ? DB.currentUser.name : "Government Department",
    decision, reason: reason.trim(),
    timestamp: new Date().toISOString()
  };
  DB.governmentDecisions.unshift(record);

  const startup = getStartup(pilot.startupId);
  addAuditLog(`Government decision recorded — ${decision} — ${pilot.title}`);
  addNotification(`Government decision recorded for ${pilot.title}: ${decision}.`);
  if(startup) addNotification(`${startup.name}: Government has recorded a decision on ${pilot.title} — ${decision}.`);
  persist();
  return {ok:true, decision:record};
}

function getDecisionsForPilot(pilotId){
  return DB.governmentDecisions.filter(d=>d.pilotId===pilotId);
}
function getLatestDecisionForPilot(pilotId){
  const rows = getDecisionsForPilot(pilotId);
  return rows.length ? rows[0] : null; // unshifted, so index 0 is latest
}

/* ---------------------------------------------------------
   Part 3 — Procurement Handoff (Section 47)
   --------------------------------------------------------- */
const PROCUREMENT_CHANNELS = ["GeM","MahaTenders","Department Procurement","Other Authorized Channel"];

function getProcurementReadiness(pilotId){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ready:false, checklist:[]};
  const bundle = getDecisionEvidenceBundle(pilotId);
  const decision = getLatestDecisionForPilot(pilotId);

  const checklist = [
    {label:"Pilot Completed", pass: pilot.currentStage >= 3 && pilot.stages[3].status === "done"},
    {label:"KPIs Validated", pass: !!(bundle.expertValidation.postValidation && bundle.expertValidation.postValidation.status === "Submitted")},
    {label:"Expert Validation", pass: !!(
      (bundle.expertValidation.postValidation && bundle.expertValidation.postValidation.recommendation === "Recommend") ||
      (bundle.expertValidation.preEvaluation && bundle.expertValidation.preEvaluation.recommendation === "Recommend")
    )},
    {label:"User Feedback", pass: bundle.userFeedback.total > 0},
    {label:"Government Decision", pass: !!decision && (decision.decision === "APPROVE FOR PROCUREMENT" || decision.decision === "APPROVE WITH CONDITIONS")},
    {label:"Required Documents", pass: bundle.documents.length > 0}
  ];
  const ready = checklist.every(c=>c.pass);
  return {ready, checklist, decision};
}

function createProcurementHandoff(pilotId, {channel, externalReference, handoffDate, responsibleOfficer, status}){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  const readiness = getProcurementReadiness(pilotId);
  if(!readiness.ready) return {ok:false, message:"This pilot does not yet meet all procurement readiness requirements."};
  if(!PROCUREMENT_CHANNELS.includes(channel)) return {ok:false, message:"Select a procurement channel."};
  if(!responsibleOfficer || !responsibleOfficer.trim()) return {ok:false, message:"Responsible officer is required."};

  const record = {
    id: genId("PH"), pilotId,
    channel,
    externalReference: (externalReference||"").trim() || `DEMO-${channel.replace(/\s+/g,"").toUpperCase()}-${pilot.id}`,
    handoffDate: handoffDate || new Date().toISOString().slice(0,10),
    responsibleOfficer: responsibleOfficer.trim(),
    status: status || "Handed Off — Awaiting External Response",
    createdAt: new Date().toISOString()
  };
  DB.procurementHandoffs.unshift(record);

  addAuditLog(`Procurement handoff created (DEMO) — ${pilot.title} → ${channel}`);
  addNotification(`${pilot.title} handed off to external procurement (${channel}) — simulated reference only.`);
  persist();
  return {ok:true, handoff:record};
}

function getHandoffForPilot(pilotId){
  return DB.procurementHandoffs.find(h=>h.pilotId===pilotId) || null;
}
function updateProcurementHandoffStatus(handoffId, status){
  const h = DB.procurementHandoffs.find(x=>x.id===handoffId);
  if(!h) return {ok:false, message:"Handoff record not found."};
  h.status = status;
  addAuditLog(`Procurement handoff status updated — ${h.id} → ${status}`);
  persist();
  return {ok:true, handoff:h};
}

/* ---------------------------------------------------------
   Part 4 — Scale-Up
   --------------------------------------------------------- */
const SCALEUP_STATUSES = ["PLANNED","APPROVED","IN ROLLOUT","SCALED","COMPLETED"];

function createScaleUp(pilotId, {targetDepartments, targetLocations, rolloutCount, expectedImpact}){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  const handoff = getHandoffForPilot(pilotId);
  if(!handoff) return {ok:false, message:"Create a procurement handoff before starting scale-up."};
  if(getScaleUpForPilot(pilotId)) return {ok:false, message:"A scale-up record already exists for this pilot."};

  const record = {
    id: genId("SU"), pilotId,
    targetDepartments: (targetDepartments||"").trim(),
    targetLocations: (targetLocations||"").trim(),
    rolloutCount: Number(rolloutCount) || 0,
    expectedImpact: (expectedImpact||"").trim(),
    actualImpact: "",
    deploymentStatus: "PLANNED",
    createdAt: new Date().toISOString()
  };
  DB.scaleUps.unshift(record);

  addAuditLog(`Scale-up initiated — ${pilot.title}`);
  addNotification(`Scale-up plan created for ${pilot.title}.`);
  persist();
  return {ok:true, scaleUp:record};
}

function getScaleUpForPilot(pilotId){
  return DB.scaleUps.find(s=>s.pilotId===pilotId) || null;
}

function updateScaleUp(scaleUpId, {deploymentStatus, actualImpact}){
  const s = DB.scaleUps.find(x=>x.id===scaleUpId);
  if(!s) return {ok:false, message:"Scale-up record not found."};
  if(deploymentStatus){
    if(!SCALEUP_STATUSES.includes(deploymentStatus)) return {ok:false, message:"Invalid deployment status."};
    s.deploymentStatus = deploymentStatus;
  }
  if(actualImpact !== undefined) s.actualImpact = actualImpact.trim();
  addAuditLog(`Scale-up updated — ${s.id} → ${s.deploymentStatus}`);
  addNotification(`Scale-up status for ${getPilot(s.pilotId)?.title || s.pilotId} is now ${s.deploymentStatus}.`);
  persist();
  return {ok:true, scaleUp:s};
}

/* ---------------------------------------------------------
   Part 5 — DEMO Policy / RAG Assistant (Section 48-49)
   Small, static, clearly-labelled knowledge base drawn from
   this project's own approved brief (documents/136.pdf) and
   the platform's own governance rules — not a live vector DB.
   --------------------------------------------------------- */
const POLICY_KB = [
  {
    id:"kb-actors", title:"The Five Core Actor Modules",
    content:"GovInnovate recognises five actor groups: Government (defines problems, monitors pilots, makes procurement decisions), Startup (provides innovation, evidence and executes pilots), Expert/Verifier (independent technical evaluation and evidence/pilot validation), Admin (governs the platform, users, policies and audit) and the General User/Beneficiary (provides real-world feedback on pilots and deployed solutions). The core governance principle is: AI assists, Experts validate, Government decides, Users provide feedback, Admin governs."
  },
  {
    id:"kb-pilot-lifecycle", title:"The Pilot Process / Lifecycle",
    content:"The pilot lifecycle runs: Challenge → PoC Selection → Sandbox Integration → Active Micro-Pilot → Validation (Expert) → User Feedback → Government Decision → Procurement Handoff → Scale-Up. Each stage must be completed, with evidence, before the next one unlocks."
  },
  {
    id:"kb-evidence-required", title:"What Evidence Is Required",
    content:"Before a Government decision can be made, a pilot needs: verified technical evidence reviewed by an assigned Expert, pilot performance metrics validated against the challenge's stated targets, at least one round of user/beneficiary feedback, a completed risk assessment, and a cost summary from the milestone/payment ledger. Government combines Technical Evidence, Pilot Metrics, Expert Validation and User Feedback into a single decision — no single layer can approve procurement on its own."
  },
  {
    id:"kb-pilot-validation-docs", title:"Documents Needed for Pilot Validation",
    content:"Pilot validation evidence typically includes: milestone evidence files uploaded by the startup (e.g. deployment logs, accuracy/validation reports), the Expert's evidence review comments and verified values, the Expert's Pilot Validation metric table (target vs. actual), and any generated compliance documents such as the NDA & IP Protection document or the Micro-Pilot Risk Report."
  },
  {
    id:"kb-feedback", title:"How User Feedback Works",
    content:"Once a pilot reaches Active Micro-Pilot or later, eligible public users (citizens, beneficiaries, service users, employees or other permitted pilot users) can view basic solution information and submit feedback: a 1-5 rating, answers to four structured questions (ease of use, reliability, whether it solved the intended problem, response time), an open comment, and an optional issue type. A DEMO classification engine labels each response Positive, Negative, Suggestion or Issue. Feedback is an evidence layer — it never automatically approves procurement."
  },
  {
    id:"kb-decision", title:"The Government Decision",
    content:"After pilot validation, Government reviews Technical Evidence, Pilot Metrics, Expert Validation, User Feedback, Risk and Cost, then chooses one of four decisions: Approve for Procurement, Approve with Conditions, Request Improvement, or Do Not Proceed. A written decision reason is required, and the decision maker, decision, reason and timestamp are recorded to the audit log. Neither the AI matching/structuring engines nor the Expert can make this decision — only Government can."
  },
  {
    id:"kb-procurement-handoff", title:"What The Approved Procurement Document Says / Procurement Handoff",
    content:"After a successful Government decision, the platform runs a procurement-readiness checklist: Pilot Completed, KPIs Validated, Expert Validation, User Feedback, Government Decision, and Required Documents. Only when every item passes is a pilot marked PROCUREMENT READY. The handoff itself is recorded as a DEMO/simulated reference — a procurement channel (GeM, MahaTenders, Department Procurement, or another authorized channel), an external reference, a handoff date and a responsible officer. GovInnovate does not replace GeM, MahaTenders or department procurement systems; it hands successful, evidence-backed solutions into the appropriate existing procurement mechanism."
  },
  {
    id:"kb-scaleup", title:"Scale-Up",
    content:"Once a procurement handoff exists, Government can open a Scale-Up plan tracking target departments, target locations, rollout count, expected impact and actual impact, with a deployment status that moves through PLANNED → APPROVED → IN ROLLOUT → SCALED → COMPLETED."
  },
  {
    id:"kb-payment-governance", title:"Milestone-Based Payment Governance",
    content:"Payments are governed milestone-by-milestone: a startup submits milestone evidence, the department/authorized evaluator reviews it, an approved milestone triggers the payment workflow, and only then is payment released. This is described as Milestone-Based Payment Governance — a prototype workflow, not a real financial escrow system."
  },
  {
    id:"kb-risk", title:"Risk Assessment",
    content:"Each pilot can receive a prototype risk score across seven weighted factors (startup maturity, technology readiness, deployment complexity, data sensitivity, citizen impact, financial exposure and infrastructure dependency), producing a LOW/MEDIUM/HIGH/CRITICAL category with recommended safeguards. This is explicitly a prototype model, not an official government risk standard."
  }
];

function scoreKbEntry(entry, queryWords){
  const haystack = (entry.title + " " + entry.content).toLowerCase();
  let score = 0;
  queryWords.forEach(w=>{
    if(w.length < 3) return;
    if(haystack.includes(w)) score += 1;
  });
  return score;
}

function searchPolicyKB(question){
  const words = String(question||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean);
  if(words.length === 0) return [];
  const scored = POLICY_KB.map(entry=>({entry, score: scoreKbEntry(entry, words)}))
    .filter(s=>s.score > 0)
    .sort((a,b)=>b.score-a.score);
  return scored;
}

function answerPolicyQuestion(question){
  const q = String(question||"").trim();
  if(!q) return {ok:false, message:"Ask a question about the pilot, evidence, feedback or procurement process."};
  const matches = searchPolicyKB(q);
  if(matches.length === 0){
    return {ok:true, answer:"I could not find sufficient evidence in the approved knowledge base.", source:null, question:q};
  }
  const top = matches[0].entry;
  return {ok:true, answer: top.content, source: top.title, question:q};
}

/* ---------------------------------------------------------
   Migration helper — ensures older saved localStorage
   databases get the new public-module arrays.
   --------------------------------------------------------- */
function ensurePublicModuleDefaults(db){
  if(!db.feedback) db.feedback = [];
  if(!db.governmentDecisions) db.governmentDecisions = [];
  if(!db.procurementHandoffs) db.procurementHandoffs = [];
  if(!db.scaleUps) db.scaleUps = [];
  return db;
}
