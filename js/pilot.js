/* =========================================================
   GovInnovate — pilot.js
   Shortlisting + pilot sandbox lifecycle tracker.
   ========================================================= */

const PILOT_STAGE_NAMES = ["PoC Selection","Sandbox Integration","Active Micro-Pilot","Validation","Scale-Up Procurement"];

function shortlistStartup(challengeId, startupId){
  const challenge = getChallenge(challengeId);
  const startup = getStartup(startupId);
  if(!challenge || !startup) return {ok:false, message:"Challenge or startup not found."};
  if(!challenge.shortlist.includes(startupId)){
    challenge.shortlist.push(startupId);
    if(challenge.status === "Open") challenge.status = "Shortlisted";
  }
  addAuditLog(`${startup.name} shortlisted for "${challenge.title}"`);
  addNotification(`${startup.name} was shortlisted for ${challenge.title}.`);
  persist();
  return {ok:true};
}

function createPilot(challengeId, startupId){
  const challenge = getChallenge(challengeId);
  const startup = getStartup(startupId);
  if(!challenge || !startup) return {ok:false, message:"Challenge or startup not found."};

  const existing = DB.pilots.find(p=>p.challengeId===challengeId && p.startupId===startupId);
  if(existing) return {ok:true, pilot:existing, existed:true};

  const pilot = {
    id: genId("P"),
    challengeId, startupId, department: challenge.department,
    title: `${startup.name} — ${challenge.title} Pilot`,
    currentStage: 0,
    stages: PILOT_STAGE_NAMES.map((name,i)=>({
      name,
      status: i===0 ? "active" : "locked",
      start: i===0 ? new Date().toISOString().slice(0,10) : null,
      end: null,
      responsible: i===0 ? challenge.department : "—",
      description: i===0 ? "Proof-of-concept review in progress." : "Pending prior stage completion.",
      progress: i===0 ? 10 : 0
    }))
  };
  DB.pilots.unshift(pilot);
  challenge.status = "Piloting";

  // Auto-generate the standard milestone ledger for the new pilot
  // (Sensor Deployment / Data Collection / Accuracy Validation / Final Report).
  const defaultMilestones = [
    {name:"Sensor Deployment", target:"40 monitoring points", amount: Math.round(challenge.budget*0.34)},
    {name:"Data Collection — 30 Days", target:"30 days continuous data", amount: Math.round(challenge.budget*0.26)},
    {name:"Accuracy Validation", target: challenge.validationCriteria || "≥90% accuracy", amount: Math.round(challenge.budget*0.24)},
    {name:"Final Pilot Report", target:"Consolidated pilot report", amount: Math.round(challenge.budget*0.16)}
  ];
  defaultMilestones.forEach((m,i)=>{
    DB.milestones.push({
      id: genId("M"), pilotId: pilot.id, name:m.name, target:m.target,
      evidence:null, status: i===0 ? "Pending" : "Locked",
      paymentAmount:m.amount, paymentStatus:"Locked"
    });
  });

  addAuditLog(`PoC started — ${pilot.title}`);
  addNotification(`Proof-of-concept initiated with ${startup.name}.`);
  persist();
  return {ok:true, pilot};
}

function advancePilotStage(pilotId, {confirmedSkip=false} = {}){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  const idx = pilot.currentStage;
  const stage = pilot.stages[idx];

  if(stage.progress < 100 && !confirmedSkip){
    return {ok:false, needsConfirmation:true, message:`"${stage.name}" is only ${stage.progress}% complete. Advancing now will mark it complete early.`};
  }
  if(idx >= pilot.stages.length - 1){
    return {ok:false, message:"Pilot has already reached Scale-Up Procurement — the final stage."};
  }

  stage.status = "done";
  stage.progress = 100;
  stage.end = new Date().toISOString().slice(0,10);

  const next = pilot.stages[idx+1];
  next.status = "active";
  next.start = new Date().toISOString().slice(0,10);
  next.progress = 10;
  pilot.currentStage = idx + 1;

  const startup = getStartup(pilot.startupId);
  addAuditLog(`${startup.name} advanced to "${next.name}" — ${pilot.title}`);
  addNotification(`${startup.name} completed ${stage.name}.`);
  persist();
  return {ok:true, pilot};
}

function bumpStageProgress(pilotId, amount=15){
  const pilot = getPilot(pilotId);
  if(!pilot) return;
  const stage = pilot.stages[pilot.currentStage];
  stage.progress = Math.min(100, stage.progress + amount);
  persist();
}

/* ---------------------------------------------------------
   Government Decision → Procurement Handoff (Module 1,
   "Procurement" section of the brief). Entirely simulated —
   no GeM/MahaTenders integration. Available only once a pilot
   has reached its final stage (Scale-Up Procurement). This is
   also what allows that final stage to ever reach "done" —
   previously nothing in the app could ever mark it complete.
   --------------------------------------------------------- */
function generateProcurementReference(){
  const year = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random()*900000);
  return `GI-PROC-${year}-${n}`;
}

function ensurePilotProcurementDefaults(db){
  (db.pilots||[]).forEach(p=>{
    if(!p.procurement){
      p.procurement = {status:"Not Started", referenceNumber:null, decisionDate:null, notes:""};
    }
  });
}

function makeGovernmentDecision(pilotId, decision, notes){
  const pilot = getPilot(pilotId);
  if(!pilot) return {ok:false, message:"Pilot not found."};
  const finalIdx = pilot.stages.length - 1;
  if(pilot.currentStage !== finalIdx){
    return {ok:false, message:"A government decision can only be recorded once the pilot has reached its final stage."};
  }
  if(!pilot.procurement) pilot.procurement = {status:"Not Started", referenceNumber:null, decisionDate:null, notes:""};

  if(decision === "approve"){
    pilot.stages[finalIdx].status = "done";
    pilot.stages[finalIdx].end = new Date().toISOString().slice(0,10);
    pilot.stages[finalIdx].progress = 100;
    pilot.procurement.status = "Handed Off";
    pilot.procurement.referenceNumber = generateProcurementReference();
    pilot.procurement.decisionDate = new Date().toISOString();
    pilot.procurement.notes = notes || "";
    addAuditLog(`Government approved procurement handoff — ${pilot.title} (External Procurement Handoff — DEMO, Ref ${pilot.procurement.referenceNumber})`);
    addNotification(`${pilot.title} is procurement-ready — DEMO reference ${pilot.procurement.referenceNumber} generated.`);
  }else if(decision === "reject"){
    pilot.procurement.status = "Not Approved";
    pilot.procurement.referenceNumber = null;
    pilot.procurement.decisionDate = new Date().toISOString();
    pilot.procurement.notes = notes || "";
    addAuditLog(`Government declined procurement handoff — ${pilot.title}${notes ? ": " + notes : ""}`);
    addNotification(`${pilot.title} was not approved for procurement handoff.`);
  }else if(decision === "more-evidence"){
    pilot.procurement.status = "Needs More Evidence";
    pilot.procurement.decisionDate = new Date().toISOString();
    pilot.procurement.notes = notes || "";
    addAuditLog(`Government requested more evidence before procurement handoff — ${pilot.title}${notes ? ": " + notes : ""}`);
    addNotification(`More evidence requested before procurement handoff for ${pilot.title}.`);
  }else{
    return {ok:false, message:"Unrecognised decision."};
  }
  persist();
  return {ok:true, pilot};
}
