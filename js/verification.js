/* =========================================================
   GovInnovate — verification.js
   Simulated DPIIT / MSInS startup verification (mock API)
   + automated procurement-eligibility waiver rules engine.
   ========================================================= */

/**
 * Simulates a DPIIT registry lookup by registration number.
 * Clearly a mock — see UI labelling "Prototype Verification • Mock Government API".
 */
function verifyStartup(regNumber){
  const startup = DB.startups.find(s=>s.dpiitNumber.trim().toLowerCase() === regNumber.trim().toLowerCase());
  if(!startup){
    return {ok:false, message:"No DPIIT/MSInS record found for this registration number in the prototype registry."};
  }
  startup.verification.status = "verified";
  startup.verification.validationStatus = "Verified";
  addAuditLog(`${startup.name} verified through prototype verification engine (${startup.dpiitNumber})`);
  addNotification(`${startup.name} completed DPIIT verification.`);
  persist();
  return {ok:true, startup};
}

/**
 * Automated procurement-eligibility / waiver rules engine.
 * Rule: DPIIT-recognised + verified startups receive EMD waiver
 * and turnover / experience exemptions, per common startup
 * procurement relaxation norms — simplified for this prototype.
 */
function calculateStartupEligibility(startup){
  const verified = startup.verification.status === "verified";
  const dpiitRecognized = !!startup.dpiitNumber;

  const eligibility = {
    verified, dpiitRecognized,
    emd: verified && dpiitRecognized ? 0 : null,
    emdWaived: verified && dpiitRecognized,
    turnoverExemption: verified && dpiitRecognized,
    experienceExemption: verified && dpiitRecognized,
    rules:[]
  };

  eligibility.rules.push({
    title:"EMD Requirement",
    triggered: eligibility.emdWaived,
    explanation: eligibility.emdWaived
      ? "Earnest Money Deposit is waived because the startup holds active DPIIT recognition and has passed prototype verification."
      : "EMD waiver requires both DPIIT recognition and successful verification."
  });
  eligibility.rules.push({
    title:"Turnover Requirement",
    triggered: eligibility.turnoverExemption,
    explanation: eligibility.turnoverExemption
      ? "Minimum-turnover criteria are relaxed under standard startup exemption provisions, subject to the specific tender's policy."
      : "Turnover exemption requires verified DPIIT recognition."
  });
  eligibility.rules.push({
    title:"Prior Experience Requirement",
    triggered: eligibility.experienceExemption,
    explanation: eligibility.experienceExemption
      ? "Prior-experience criteria are relaxed under the startup exemption rule applicable to newly established entities."
      : "Experience exemption requires verified DPIIT recognition."
  });

  return eligibility;
}
