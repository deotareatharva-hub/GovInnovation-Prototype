/* =========================================================
   GovInnovate — risk.js
   Prototype risk model — NOT an official government standard.
   ========================================================= */

// Weights sum to 1.0 across the seven factors (1-5 scale each).
const RISK_WEIGHTS = {
  maturity:0.12, readiness:0.16, complexity:0.16, dataSensitivity:0.14,
  citizenImpact:0.18, financialExposure:0.14, infrastructure:0.10
};

const RISK_LABELS = {
  maturity:"Startup Maturity", readiness:"Technology Readiness", complexity:"Deployment Complexity",
  dataSensitivity:"Data Sensitivity", citizenImpact:"Citizen Impact",
  financialExposure:"Financial Exposure", infrastructure:"Infrastructure Dependency"
};

function calculateRisk(pilotId, factors){
  let weightedSum = 0;
  Object.keys(RISK_WEIGHTS).forEach(key=>{
    const v = Number(factors[key]) || 1; // 1-5
    weightedSum += (v/5) * RISK_WEIGHTS[key];
  });
  const score = Math.round(weightedSum * 100);

  let category;
  if(score <= 25) category = "LOW";
  else if(score <= 50) category = "MEDIUM";
  else if(score <= 75) category = "HIGH";
  else category = "CRITICAL";

  const recommendations = [];
  if(category === "LOW"){
    recommendations.push("Proceed with standard monitoring cadence.");
  }else if(category === "MEDIUM"){
    recommendations.push("Pilot should begin in a controlled sandbox environment before public deployment.");
    recommendations.push("Schedule a mid-pilot review checkpoint.");
  }else if(category === "HIGH"){
    recommendations.push("Restrict initial deployment to a limited, controlled cohort.");
    recommendations.push("Require weekly milestone evidence review.");
    recommendations.push("Assign a dedicated department reviewer for citizen-facing components.");
  }else{
    recommendations.push("Escalate for program-administrator sign-off before proceeding.");
    recommendations.push("Do not scale beyond the sandbox environment until risk factors are reduced.");
  }
  if(factors.dataSensitivity >= 4){
    recommendations.push("Apply enhanced data-protection safeguards given elevated data sensitivity.");
  }

  const assessment = {
    id: genId("RA"), pilotId, factors, score, category,
    date: new Date().toISOString(), approvalStatus:"Reviewed", recommendations
  };

  const existingIdx = DB.riskAssessments.findIndex(r=>r.pilotId===pilotId);
  if(existingIdx >= 0) DB.riskAssessments[existingIdx] = assessment;
  else DB.riskAssessments.unshift(assessment);
  persist();

  const pilot = getPilot(pilotId);
  addAuditLog(`Risk score calculated for Pilot ${pilotId} — ${category}`);
  addNotification(`Risk score updated for Pilot ${pilotId}.`);
  return assessment;
}
