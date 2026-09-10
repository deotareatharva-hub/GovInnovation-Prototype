/* =========================================================
   GovInnovate — documents.js
   Client-side PDF generation for compliance documents.
   All output is clearly labelled as a prototype template.
   ========================================================= */

function pdfHeader(doc, title){
  doc.setFillColor(10,30,61);
  doc.rect(0,0,210,26,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.text("GovInnovate", 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.text("SIH 2026 • PS 136 Prototype", 14, 18);
  doc.setFontSize(16);
  doc.setFont('helvetica','bold');
  doc.text(title, 14, 40);
  doc.setTextColor(20,32,56);
}

function pdfDisclaimer(doc, y, text){
  doc.setDrawColor(185,137,0);
  doc.setFillColor(251,240,214);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'FD');
  doc.setTextColor(154,107,0);
  doc.setFontSize(9);
  doc.setFont('helvetica','bold');
  const lines = doc.splitTextToSize(text, 174);
  doc.text(lines, 18, y+6);
  doc.setTextColor(20,32,56);
  doc.setFont('helvetica','normal');
  return y + 16 + lines.length*1;
}

function generateNdaDocument(challengeId, startupId){
  if(typeof window.jspdf === "undefined"){
    return {ok:false, message:"PDF library unavailable offline — reconnect to the internet and try again."};
  }
  const challenge = getChallenge(challengeId);
  const startup = getStartup(startupId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  pdfHeader(doc, "Mutual NDA & IP Protection");
  let y = 52;
  y = pdfDisclaimer(doc, y, "Prototype Template — Legal review required before actual use. Not a legally binding instrument in this form.");
  y += 10;

  doc.setFontSize(11);
  const rows = [
    ["Government Department", challenge ? challenge.department : "—"],
    ["Startup", startup ? `${startup.name} (${startup.dpiitNumber})` : "—"],
    ["Project Name", challenge ? challenge.title : "—"],
    ["Confidentiality", "Both parties agree to protect confidential information shared during assessment and pilot evaluation."],
    ["IP Ownership", "Pre-existing IP remains with its original owner. Jointly developed IP during the pilot to be governed by a separate agreement."],
    ["Permitted Disclosure", "Disclosure permitted only to personnel directly involved in evaluation, subject to equivalent confidentiality obligations."],
    ["Data Protection", "All shared data to be handled per applicable data protection and privacy norms."],
    ["Duration", "This agreement remains in effect for the duration of the pilot and 24 months thereafter."]
  ];

  rows.forEach(([label,value])=>{
    doc.setFont('helvetica','bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(String(value), 130);
    doc.text(lines, 70, y);
    y += Math.max(7, lines.length*5.4) + 3;
    if(y > 260){ doc.addPage(); y = 20; }
  });

  y += 10;
  doc.setFont('helvetica','bold');
  doc.text("Signatures", 14, y); y += 10;
  doc.setFont('helvetica','normal');
  doc.line(14, y, 90, y);
  doc.line(120, y, 196, y);
  doc.text("Authorised Signatory — Department", 14, y+5);
  doc.text("Authorised Signatory — Startup", 120, y+5);

  const filename = `NDA_IP_Protection_${startup ? startup.id : "startup"}_${challenge ? challenge.id : "challenge"}.pdf`;
  doc.save(filename);

  const record = {id: genId("DOC"), type:"NDA & IP Protection", challengeId, startupId, filename, generatedAt: new Date().toISOString()};
  DB.documents.unshift(record);
  persist();
  addAuditLog(`Generated NDA & IP Protection document for ${startup ? startup.name : "startup"}`);
  return {ok:true, record};
}

function generateRiskReportDocument(pilotId){
  const pilot = getPilot(pilotId);
  const risk = DB.riskAssessments.find(r=>r.pilotId===pilotId);
  if(!pilot || !risk) return {ok:false, message:"Calculate a risk score for this pilot before generating a report."};
  if(typeof window.jspdf === "undefined"){
    return {ok:false, message:"PDF library unavailable offline — reconnect to the internet and try again."};
  }

  const challenge = getChallenge(pilot.challengeId);
  const startup = getStartup(pilot.startupId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  pdfHeader(doc, "Micro-Pilot Risk Report");
  let y = 52;
  y = pdfDisclaimer(doc, y, "Prototype Risk Model — not an official government risk standard.");
  y += 10;

  doc.setFontSize(11);
  const rows = [
    ["Startup", startup ? startup.name : "—"],
    ["Department", pilot.department],
    ["Challenge", challenge ? challenge.title : "—"],
    ["Risk Score", `${risk.score} / 100`],
    ["Risk Category", risk.category],
    ["Date", formatDate(risk.date)],
    ["Approval Status", risk.approvalStatus]
  ];
  rows.forEach(([label,value])=>{
    doc.setFont('helvetica','bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica','normal');
    doc.text(String(value), 70, y);
    y += 8;
  });

  y += 4;
  doc.setFont('helvetica','bold');
  doc.text("Individual Risk Factors", 14, y); y += 8;
  doc.setFont('helvetica','normal');
  Object.keys(RISK_LABELS).forEach(key=>{
    doc.text(`${RISK_LABELS[key]}: ${risk.factors[key]} / 5`, 18, y);
    y += 6.5;
  });

  y += 4;
  doc.setFont('helvetica','bold');
  doc.text("Recommendations", 14, y); y += 8;
  doc.setFont('helvetica','normal');
  risk.recommendations.forEach(rec=>{
    const lines = doc.splitTextToSize(`• ${rec}`, 178);
    doc.text(lines, 18, y);
    y += lines.length*6;
  });

  const filename = `Risk_Report_${pilot.id}.pdf`;
  doc.save(filename);

  const record = {id: genId("DOC"), type:"Risk Report", pilotId, filename, generatedAt: new Date().toISOString()};
  DB.documents.unshift(record);
  persist();
  addAuditLog(`Generated risk report for Pilot ${pilot.id}`);
  return {ok:true, record};
}
