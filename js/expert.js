/* =========================================================
   GovInnovate — expert.js
   Expert / Verifier module: independent technical evaluation
   and evidence/pilot validation, sitting between Startup
   Shortlisting and PoC, and again between Micro-Pilot and
   Government Approval. This file owns the data model + all
   business rules; expert-ui.js owns rendering only.
   ========================================================= */

/* ---------------------------------------------------------
   Scoring configuration (Section 5 — configurable by
   program authority, NOT an official scoring standard)
   --------------------------------------------------------- */
const EVAL_CRITERIA = [
  {key:"technicalFeasibility", label:"Technical Feasibility", weight:0.25},
  {key:"innovation",           label:"Innovation / Novelty", weight:0.20},
  {key:"deploymentReadiness",  label:"Deployment Readiness", weight:0.20},
  {key:"scalability",          label:"Scalability", weight:0.15},
  {key:"teamCapability",       label:"Team Capability", weight:0.10},
  {key:"evidenceQuality",      label:"Evidence / Validation Quality", weight:0.10}
];

/* ---------------------------------------------------------
   Structured technical assessment questions (Section 7)
   --------------------------------------------------------- */
const TECH_QUESTIONS = {
  technicalFeasibility:{
    label:"Technical Feasibility",
    items:[
      {id:"tf1", text:"Is the proposed technology technically feasible?"},
      {id:"tf2", text:"Has the technology been demonstrated outside a laboratory?"},
      {id:"tf3", text:"Are required hardware/software components available?"},
      {id:"tf4", text:"Can it integrate with existing government infrastructure?"}
    ]
  },
  innovation:{
    label:"Innovation",
    items:[
      {id:"in1", text:"Does the solution provide a meaningful improvement over existing approaches?"},
      {id:"in2", text:"Is there a novel technical component?"}
    ]
  },
  deploymentReadiness:{
    label:"Deployment Readiness",
    items:[
      {id:"dr1", text:"Is the solution ready for field deployment?"},
      {id:"dr2", text:"Are maintenance requirements reasonable?"},
      {id:"dr3", text:"Is the solution suitable for the target environment?"}
    ]
  },
  scalability:{
    label:"Scalability",
    items:[
      {id:"sc1", text:"Can the solution scale beyond the pilot?"},
      {id:"sc2", text:"Can it be deployed across multiple districts?"},
      {id:"sc3", text:"Are operating costs sustainable?"}
    ]
  },
  evidenceQuality:{
    label:"Evidence",
    items:[
      {id:"ev1", text:"Are startup claims supported by credible evidence?"},
      {id:"ev2", text:"Are test results reproducible?"},
      {id:"ev3", text:"Are the submitted documents sufficient?"}
    ]
  }
};
const ANSWER_OPTIONS = ["Yes","Partially","No"];

const RECOMMENDATION_LABELS = {
  "Recommend":"Recommend",
  "Recommend with Conditions":"Recommend with Conditions",
  "Do Not Recommend":"Do Not Recommend"
};

/* Expert status shown on Government / Startup dashboards (Sections 12–13) */
const EXPERT_STATUS_BADGES = {
  "Awaiting Expert Review":"badge-neutral",
  "Conflict Declaration Pending":"badge-warning",
  "Under Evaluation":"badge-warning",
  "Recommended":"badge-success",
  "Recommended with Conditions":"badge-warning",
  "Not Recommended":"badge-danger",
  "Pilot Validation Pending":"badge-warning",
  "Pilot Validated":"badge-success",
  "Declined":"badge-neutral"
};

/* ---------------------------------------------------------
   ID + lookup helpers
   --------------------------------------------------------- */
function getExpert(id){ return DB.experts.find(e=>e.id===id); }
function getAssignment(id){ return DB.expertAssignments.find(a=>a.id===id); }
function getAssignmentsForExpert(expertId){ return DB.expertAssignments.filter(a=>a.expertId===expertId); }
function getEvaluationForAssignment(assignmentId){ return DB.expertEvaluations.find(e=>e.assignmentId===assignmentId); }
function getPilotValidationForAssignment(assignmentId){ return DB.pilotValidations.find(v=>v.assignmentId===assignmentId); }
function getConflictDeclaration(assignmentId){ return DB.conflictDeclarations.find(c=>c.assignmentId===assignmentId); }
function getEvidenceForAssignment(assignmentId){ return DB.evidenceReviews.filter(e=>e.assignmentId===assignmentId); }
function getClarificationsForAssignment(assignmentId){ return DB.expertClarifications.filter(c=>c.assignmentId===assignmentId); }
function getCommentsForAssignment(assignmentId){ return DB.expertComments.filter(c=>c.assignmentId===assignmentId); }

/* Latest assignment covering a startup+challenge pair (used by Gov/Startup dashboards) */
function latestAssignmentFor(startupId, challengeId){
  const rows = DB.expertAssignments.filter(a=>a.startupId===startupId && a.challengeId===challengeId);
  return rows.length ? rows[rows.length-1] : null;
}
function assignmentsForStartup(startupId){ return DB.expertAssignments.filter(a=>a.startupId===startupId); }

/* ---------------------------------------------------------
   Scoring maths
   --------------------------------------------------------- */
function computeOverallScore(scores){
  const total = EVAL_CRITERIA.reduce((sum,c)=> sum + (Number(scores[c.key])||0) * c.weight, 0);
  return Math.round(total*10)/10;
}

/* ---------------------------------------------------------
   Section 19 — Admin: assign an expert
   --------------------------------------------------------- */
function assignExpert({startupId, challengeId, expertId, type, deadline}){
  const startup = getStartup(startupId);
  const challenge = getChallenge(challengeId);
  const expert = getExpert(expertId);
  if(!startup || !challenge || !expert) return {ok:false, message:"Select a startup, challenge and expert."};

  const assignment = {
    id: genId("EA"),
    startupId, challengeId, expertId, type,
    deadline: deadline || null,
    status:"Awaiting Expert Review",
    assignedAt: new Date().toISOString()
  };
  DB.expertAssignments.unshift(assignment);
  persist();
  addAuditLog(`Expert assigned to ${startup.name} — ${expert.name} (${type})`);
  addNotification(`You have been assigned a technical review for ${startup.name}.`);
  return {ok:true, assignment};
}

/* ---------------------------------------------------------
   Section 4 — Conflict of Interest declaration
   --------------------------------------------------------- */
function declareNoConflict(assignmentId){
  const a = getAssignment(assignmentId);
  if(!a) return {ok:false, message:"Assignment not found."};
  if(getConflictDeclaration(assignmentId)) return {ok:true, alreadyDeclared:true};

  DB.conflictDeclarations.unshift({
    id: genId("CD"), assignmentId, expertId:a.expertId,
    declaredNoConflict:true, declaredAt:new Date().toISOString()
  });
  a.status = "Under Evaluation";
  persist();
  const startup = getStartup(a.startupId);
  addAuditLog(`Conflict-of-interest declaration submitted — ${startup ? startup.name : a.startupId}`);
  addAuditLog(`Technical evaluation started — ${startup ? startup.name : a.startupId}`);
  return {ok:true};
}

function declineAssignment(assignmentId, reason){
  const a = getAssignment(assignmentId);
  if(!a) return {ok:false, message:"Assignment not found."};
  a.status = "Declined";
  persist();
  const startup = getStartup(a.startupId);
  addAuditLog(`Expert declined assignment — ${startup ? startup.name : a.startupId}${reason ? ": "+reason : ""}`);
  addNotification(`Assignment for ${startup ? startup.name : "a startup"} was declined and needs reassignment.`);
  return {ok:true};
}

/* ---------------------------------------------------------
   Section 6 — Technical evidence review
   --------------------------------------------------------- */
function reviewEvidence(evidenceId, {status, verifiedValue, comment}){
  const ev = DB.evidenceReviews.find(e=>e.id===evidenceId);
  if(!ev) return {ok:false, message:"Evidence item not found."};
  ev.status = status;
  if(verifiedValue !== undefined && verifiedValue !== "") ev.verifiedValue = verifiedValue;
  ev.comment = comment || "";
  ev.reviewedAt = new Date().toISOString();
  persist();
  addAuditLog(`Evidence marked ${status} — ${ev.evidenceName}`);
  return {ok:true, evidence:ev};
}

function requestClarification(assignmentId, question){
  const a = getAssignment(assignmentId);
  if(!a || !question || !question.trim()) return {ok:false, message:"Enter a clarification request."};
  DB.expertClarifications.unshift({
    id: genId("CL"), assignmentId, question:question.trim(),
    response:null, status:"Pending", requestedAt:new Date().toISOString()
  });
  persist();
  const startup = getStartup(a.startupId);
  addAuditLog(`Clarification requested — ${startup ? startup.name : a.startupId}`);
  addNotification(`Expert requested additional evidence from ${startup ? startup.name : "a startup"}.`);
  return {ok:true};
}

function respondToClarification(clarificationId, {documentName}){
  const cl = DB.expertClarifications.find(c=>c.id===clarificationId);
  if(!cl) return {ok:false, message:"Clarification not found."};
  if(!documentName) return {ok:false, message:"Attach a document before responding."};
  cl.response = {documentName, submittedAt:new Date().toISOString()};
  cl.status = "Responded";
  persist();
  const a = getAssignment(cl.assignmentId);
  const startup = a ? getStartup(a.startupId) : null;
  addAuditLog(`${startup ? startup.name : "Startup"} submitted requested evidence.`);
  addNotification("Startup submitted requested evidence.");
  return {ok:true};
}

function addExpertComment(assignmentId, text){
  if(!text || !text.trim()) return {ok:false};
  DB.expertComments.unshift({id: genId("EC"), assignmentId, text:text.trim(), createdAt:new Date().toISOString()});
  persist();
  return {ok:true};
}

/* ---------------------------------------------------------
   Section 5, 8 — Submit the pre-pilot technical evaluation
   --------------------------------------------------------- */
function submitEvaluation(assignmentId, {scores, answers, recommendation, conditions, comments}){
  const a = getAssignment(assignmentId);
  if(!a) return {ok:false, message:"Assignment not found."};
  if(!getConflictDeclaration(assignmentId)) return {ok:false, message:"Complete the conflict-of-interest declaration before submitting."};
  if(!recommendation) return {ok:false, message:"Select a recommendation before submitting."};
  if(recommendation !== "Recommend" && !(comments && comments.trim())){
    return {ok:false, message:"A justification/comment is required for this recommendation."};
  }

  const overallScore = computeOverallScore(scores);
  let record = getEvaluationForAssignment(assignmentId);
  const payload = {
    startupId:a.startupId, challengeId:a.challengeId, expertId:a.expertId,
    scores, answers, overallScore, recommendation,
    conditions: conditions || [], comments: comments || "",
    status:"Submitted", submittedAt: new Date().toISOString()
  };
  if(record){
    Object.assign(record, payload);
  }else{
    record = {id: genId("EV"), assignmentId, createdAt:new Date().toISOString(), ...payload};
    DB.expertEvaluations.unshift(record);
  }

  const statusMap = {
    "Recommend":"Recommended",
    "Recommend with Conditions":"Recommended with Conditions",
    "Do Not Recommend":"Not Recommended"
  };
  a.status = statusMap[recommendation];
  persist();

  const startup = getStartup(a.startupId);
  addAuditLog(`Expert score submitted: ${overallScore} — ${startup ? startup.name : a.startupId}`);
  addAuditLog(`Recommendation: ${recommendation} — ${startup ? startup.name : a.startupId}`);
  addNotification(`Your technical evaluation has been completed.`);
  addNotification(`Expert assessment completed for ${startup ? startup.name : "startup"}.`);
  return {ok:true, evaluation:record};
}

/* ---------------------------------------------------------
   Section 9–10 — Pilot Validation
   --------------------------------------------------------- */
function defaultPilotMetrics(challenge){
  return [
    {name:"Primary Validation Metric", target: (challenge && challenge.validationCriteria) || "As specified in challenge", actual:"", status:"Pending", evidence:"", comment:""},
    {name:"Response / Processing Time", target:"<10 min", actual:"", status:"Pending", evidence:"", comment:""},
    {name:"System / Sensor Uptime", target:"≥95%", actual:"", status:"Pending", evidence:"", comment:""},
    {name:"False Positive / Error Rate", target:"<5%", actual:"", status:"Pending", evidence:"", comment:""}
  ];
}

function startPilotValidation(assignmentId){
  const a = getAssignment(assignmentId);
  if(!a) return {ok:false, message:"Assignment not found."};
  let record = getPilotValidationForAssignment(assignmentId);
  if(record) return {ok:true, validation:record, existed:true};

  const pilot = getPilotForStartup(a.startupId);
  const challenge = getChallenge(a.challengeId);
  record = {
    id: genId("PV"), assignmentId, pilotId: pilot ? pilot.id : null, expertId:a.expertId,
    metrics: defaultPilotMetrics(challenge),
    overallResult:null, recommendation:null, comments:"", evidenceCompleteness:0,
    status:"Draft", createdAt:new Date().toISOString(), submittedAt:null
  };
  DB.pilotValidations.unshift(record);
  a.status = "Pilot Validation Pending";
  persist();
  return {ok:true, validation:record};
}

function updatePilotMetric(validationId, index, {actual, status, evidence, comment}){
  const v = DB.pilotValidations.find(p=>p.id===validationId);
  if(!v || !v.metrics[index]) return {ok:false, message:"Metric not found."};
  const m = v.metrics[index];
  if(actual !== undefined) m.actual = actual;
  if(status !== undefined) m.status = status;
  if(evidence !== undefined) m.evidence = evidence;
  if(comment !== undefined) m.comment = comment;
  persist();
  addAuditLog(`Pilot metric validated — ${m.name}: ${status}`);
  return {ok:true, validation:v};
}

function submitPilotValidation(validationId, {recommendation, comments}){
  const v = DB.pilotValidations.find(p=>p.id===validationId);
  if(!v) return {ok:false, message:"Validation not found."};
  if(!recommendation) return {ok:false, message:"Select a recommendation before submitting."};
  const total = v.metrics.length || 1;
  const passed = v.metrics.filter(m=>m.status==="Pass").length;
  const conditional = v.metrics.filter(m=>m.status==="Conditional").length;
  v.overallResult = Math.round(((passed + conditional*0.5) / total) * 100);
  v.evidenceCompleteness = Math.round((v.metrics.filter(m=>m.evidence && m.evidence.trim()).length / total) * 100);
  v.recommendation = recommendation;
  v.comments = comments || "";
  v.status = "Submitted";
  v.submittedAt = new Date().toISOString();
  persist();

  const a = getAssignment(v.assignmentId);
  if(a){
    a.status = "Pilot Validated";
    persist();
  }
  const startup = a ? getStartup(a.startupId) : null;
  addAuditLog(`Technical validation submitted — ${startup ? startup.name : v.pilotId} (${v.overallResult}% pilot performance)`);
  addNotification("Pilot validation submitted. Government review required.");
  addNotification("Technical validation submitted.");
  return {ok:true, validation:v};
}

/* ---------------------------------------------------------
   Migration — extend the existing data model without
   destroying data already saved to localStorage.
   --------------------------------------------------------- */
function ensureExpertModuleDefaults(db){
  if(!db.experts) db.experts = [{
    id:"EXP001", name:"Dr. Ananya Kulkarni", domain:"Water Technology & IoT",
    experience:12, organization:"Government/Academic/Industry Expert", status:"Active"
  }];
  if(!db.expertAssignments) db.expertAssignments = [];
  if(!db.expertEvaluations) db.expertEvaluations = [];
  if(!db.evidenceReviews) db.evidenceReviews = [];
  if(!db.pilotValidations) db.pilotValidations = [];
  if(!db.conflictDeclarations) db.conflictDeclarations = [];
  if(!db.expertComments) db.expertComments = [];
  if(!db.expertClarifications) db.expertClarifications = [];
  return db;
}
