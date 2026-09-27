/* =========================================================
   GovInnovate — milestone.js
   Milestone evidence → review → approval → payment release.
   Payment can NEVER move to "Released" without an "Approved"
   milestone status — enforced here, not just in the UI.
   ========================================================= */

function submitMilestoneEvidence(milestoneId, file){
  const milestone = DB.milestones.find(m=>m.id===milestoneId);
  if(!milestone) return {ok:false, message:"Milestone not found."};
  if(milestone.status === "Locked"){
    return {ok:false, message:"This milestone is locked until the prior milestone is approved."};
  }
  if(!file) return {ok:false, message:"Select a file before submitting evidence."};

  milestone.evidence = {
    filename: file.name,
    type: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString()
  };
  milestone.status = "Submitted";
  persist();

  const pilot = getPilot(milestone.pilotId);
  const startup = pilot ? getStartup(pilot.startupId) : null;
  addAuditLog(`${startup ? startup.name : "Startup"} uploaded pilot evidence — ${milestone.name} (${milestone.id})`);
  addNotification(`Milestone ${milestone.id} requires department approval.`);
  return {ok:true, milestone};
}

function approveMilestone(milestoneId){
  const milestone = DB.milestones.find(m=>m.id===milestoneId);
  if(!milestone) return {ok:false, message:"Milestone not found."};
  if(milestone.status !== "Submitted"){
    return {ok:false, message:"Only milestones with submitted evidence can be approved."};
  }
  milestone.status = "Approved";
  milestone.paymentStatus = "Pending";
  persist();
  addAuditLog(`Department approved milestone ${milestone.id} — ${milestone.name}`);
  addNotification(`Milestone ${milestone.id} approved. Payment pending release.`);

  // Unlock next milestone in the same pilot, if any.
  const siblings = getMilestonesForPilot(milestone.pilotId);
  const idx = siblings.findIndex(m=>m.id===milestoneId);
  if(idx >= 0 && siblings[idx+1] && siblings[idx+1].status === "Locked"){
    siblings[idx+1].status = "Pending";
    persist();
  }
  return {ok:true, milestone};
}

function rejectMilestone(milestoneId, reason){
  const milestone = DB.milestones.find(m=>m.id===milestoneId);
  if(!milestone) return {ok:false, message:"Milestone not found."};
  if(milestone.status !== "Submitted"){
    return {ok:false, message:"Only submitted milestones can be rejected."};
  }
  milestone.status = "Pending";
  milestone.evidence = null;
  persist();
  addAuditLog(`Department rejected milestone ${milestone.id} — revision requested${reason ? ": " + reason : ""}`);
  addNotification(`Milestone ${milestone.id} sent back for revision.`);
  return {ok:true, milestone};
}

function releasePayment(milestoneId){
  const milestone = DB.milestones.find(m=>m.id===milestoneId);
  if(!milestone) return {ok:false, message:"Milestone not found."};
  if(milestone.status !== "Approved"){
    return {ok:false, message:"Payment can only be released after department approval."};
  }
  milestone.paymentStatus = "Released";
  persist();
  addAuditLog(`Payment released for milestone ${milestone.id} — ${formatINR(milestone.paymentAmount)} (Prototype Payment Simulation)`);
  addNotification(`Payment of ${formatINR(milestone.paymentAmount)} released for ${milestone.name}.`);
  return {ok:true, milestone};
}
