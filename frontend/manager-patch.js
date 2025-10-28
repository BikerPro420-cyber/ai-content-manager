(function(){
  const log = (m)=>{ try{
    const el = document.getElementById("systemLog");
    if (el) { el.innerHTML += "[" + new Date().toLocaleTimeString() + "] " + m + "<br>"; el.scrollTop = el.scrollHeight; }
    else console.log(m);
  }catch(e){} };

  async function fetchJSON(url, opts){
    const res = await fetch(url, opts||{});
    const txt = await res.text();
    try { return { ok: res.ok, json: JSON.parse(txt), txt }; }
    catch { return { ok: res.ok, json: null, txt }; }
  }

  // --- Sheets: siempre POST ---
  window.fetchChannels = async function(){
    log("Fetching channels from Google Sheets (POST)...");
    const payload = {
      action: "listChannels",
      sheetId: (window.MANAGER_CFG && window.MANAGER_CFG.SHEET_ID) || "",
      sheetName: "Videos"
    };
    const { ok, json, txt } = await fetchJSON("/.netlify/functions/google-sheets", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    if(!ok){
      log("❌ Failed to load channels: " + (txt||"HTTP error"));
      return;
    }
    const data = Array.isArray(json) ? json : (Array.isArray(json?.rows) ? json.rows : []);
    if(!Array.isArray(data)){
      log("❌ Failed to load channels: data no es array");
      return;
    }
    const list = document.getElementById("channelList");
    if(list) list.innerHTML = "";
    data.forEach(ch => {
      const div = document.createElement("div");
      div.className = "channel";
      const name   = ch.channel || ch.Channel || ch.name || ch.Name || "Unnamed";
      const genre  = ch.genre   || ch.Genre   || "";
      const status = ch.status  || ch.Status  || "Active";
      div.innerHTML = `<span>${name}</span><br>${genre} | ${status}`;
      if (list) list.appendChild(div);
    });
    log("✅ Channels loaded: " + data.length);
    return data;
  };

  // --- Run All: usa generate-video y pasa replicateKey si está ---
  window.runAllChannels = async function(){
    log("🚀 Running all channels...");
    const channels = await window.fetchChannels();
    if(!Array.isArray(channels) || channels.length === 0){
      log("❌ Error running channels: no hay canales");
      return;
    }
    const keys = (window.getKeys && window.getKeys()) || {};
    for (const ch of channels){
      const name  = ch.channel || ch.Channel || "Unnamed";
      const genre = ch.genre || ch.Genre || "Horror";
      log("🎬 Generating for " + name + "...");
      try{
        const body = {
          scenes: [{ prompt: `${genre} cinematic still, dramatic lighting` }],
          replicateKey: keys.replicate || undefined
        };
        const { ok, txt } = await fetchJSON("/.netlify/functions/generate-video", {
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)
        });
        if(!ok) throw new Error(txt || "generate-video error");
        log("✅ Completed " + name);
      }catch(e){
        log("❌ Failed " + name + ": " + (e?.message||e));
      }
    }
    log("🏁 All channels finished.");
  };

  // --- Trends: usa backend para evitar CORS ---
  window.fetchTrends = async function(source){
    source = source || "global";
    log("Fetching global & YouTube trends...");
    const { ok, json, txt } = await fetchJSON(`/.netlify/functions/trends?source=${encodeURIComponent(source)}`);
    if(!ok || !json){
      log("❌ Failed to fetch trends: " + (txt||"no json"));
      return;
    }
    const topics = json.topics || [];
    const el = document.getElementById("trendsContainer");
    if (el) el.innerHTML = topics.map(t => "• " + t).join("<br>");
    log("🌐 Trends updated.");
  };

  // Wire buttons (sobrescribe placeholders)
  const btnR = document.getElementById("refreshChannels");
  if (btnR) btnR.onclick = window.fetchChannels;
  const btnA = document.getElementById("runAll");
  if (btnA) btnA.onclick = window.runAllChannels;
  const btnT = document.getElementById("fetchTrends");
  if (btnT) btnT.onclick = ()=>window.fetchTrends("global");
})();