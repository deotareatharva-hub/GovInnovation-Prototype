/* =========================================================
   GovInnovate — matcher.js
   Simplified NLP-style problem-to-startup matching engine.
   Uses weighted keyword extraction + tag overlap scoring —
   a lightweight stand-in for cosine similarity, entirely
   client-side and dependency-free.
   ========================================================= */

const KEYWORD_WEIGHTS = {
  water:5, algal:5, bloom:4, lake:4, iot:4, sensor:4, satellite:3,
  ai:3, environment:3, environmental:3, cleantech:3, pollution:3,
  quality:3, traffic:3, congestion:3, signal:3, crop:3, disease:3,
  agriculture:3, farm:3, waste:3, segregation:3, robot:2, drone:3,
  energy:3, grid:3, meter:3, monitoring:2, detection:3, prediction:2,
  rural:2, smart:2, analytics:2, camera:2, "computer vision":3
};

// Map raw keywords to the technology-tag vocabulary used on startups.
const KEYWORD_TO_TAG = {
  water:"Water Conservation", algal:"CleanTech", bloom:"CleanTech", lake:"Water Conservation",
  iot:"IoT", sensor:"IoT", satellite:"Remote Sensing", ai:"AI",
  environment:"Environmental Monitoring", environmental:"Environmental Monitoring",
  cleantech:"CleanTech", pollution:"Environmental Monitoring", quality:"Environmental Monitoring",
  traffic:"Traffic Management", congestion:"Traffic Management", signal:"Traffic Management",
  crop:"AgriTech", disease:"AgriTech", agriculture:"AgriTech", farm:"AgriTech",
  waste:"Waste Management", segregation:"Waste Management", robot:"Robotics",
  drone:"Drones", energy:"Smart Energy", grid:"Smart Energy", meter:"Smart Energy",
  "computer vision":"Computer Vision"
};

function extractKeywords(text){
  const lower = text.toLowerCase();
  const found = [];
  Object.keys(KEYWORD_WEIGHTS).forEach(kw=>{
    if(lower.includes(kw)) found.push(kw);
  });
  return found;
}

/**
 * Scores every startup against a free-text problem description.
 * Score = weighted keyword-to-tag overlap, normalised to 0-100,
 * with a smaller boost for direct description term overlap
 * (a simplified stand-in for cosine similarity).
 */
function matchStartups(problemText){
  const keywords = extractKeywords(problemText);
  const impliedTags = new Set(keywords.map(k=>KEYWORD_TO_TAG[k]).filter(Boolean));
  const maxPossible = keywords.reduce((sum,k)=>sum + KEYWORD_WEIGHTS[k], 0) || 1;

  const results = DB.startups.map(startup=>{
    let rawScore = 0;
    const reasons = [];

    keywords.forEach(kw=>{
      const tag = KEYWORD_TO_TAG[kw];
      if(tag && startup.technologies.includes(tag)){
        rawScore += KEYWORD_WEIGHTS[kw];
        const label = tag;
        if(!reasons.includes(label)) reasons.push(label);
      }
    });

    // Description term overlap bonus (very small weight — simplified similarity)
    const descLower = startup.description.toLowerCase();
    let descBonus = 0;
    keywords.forEach(kw=>{ if(descLower.includes(kw)) descBonus += 0.6; });

    let score = Math.round(((rawScore + descBonus) / maxPossible) * 100);
    score = Math.max(0, Math.min(99, score));

    return {
      startup, score,
      matchedTags: Array.from(impliedTags).filter(t=>startup.technologies.includes(t)),
      reasons
    };
  });

  return results
    .filter(r=>r.score > 0)
    .sort((a,b)=>b.score - a.score);
}
