/* =========================================================
   GovInnovate — notifications.js
   ========================================================= */

function addNotification(text){
  DB.notifications.unshift({
    id: genId("NT"), text, createdAt: new Date().toISOString(), read:false
  });
  persist();
  if(typeof renderNotifBadge === "function") renderNotifBadge();
}

function addAuditLog(text){
  DB.auditLogs.unshift({
    id: genId("AL"), text, timestamp: new Date().toISOString()
  });
  persist();
}

function markAllNotificationsRead(){
  DB.notifications.forEach(n=>n.read=true);
  persist();
}

function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 1) return "just now";
  if(mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs/24);
  if(days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function formatClock(iso){
  return new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
}

function formatDate(iso){
  if(!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function formatINR(n){
  return "₹" + Number(n||0).toLocaleString("en-IN");
}
