(function(){
  window.fetchChannels = async function(){
    log("Fetching channels from Google Sheets (POST)...");
    const payload = {
      action: "listChannels",
      sheetId:  (window.MANAGER_CFG && MANAGER_CFG.SHEET_ID)  || "",
      sheetName:(window.MANAGER_CFG && MANAGER_CFG.SHEET_NAME)|| "Videos"
    };

    try {
      const res = await fetch("/.netlify/functions/google-sheets", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const list = document.getElementById("channelList");
      list.innerHTML = "";
      data.forEach(ch => {
        const div = document.createElement("div");
        div.className = "channel";
        const name = ch.channel || ch.Channel || ch.name || "Unnamed";
        const genre = ch.genre || ch.Genre || "";
        const status = ch.status || ch.Status || "Active";
        div.innerHTML = `<span>${name}</span><br>${genre} | ${status}`;
        list.appendChild(div);
      });

      log("✅ Channels loaded: " + data.length);
    } catch (e) {
      log("❌ Failed to load channels: " + e);
    }
  };

  // Reasignar botón por si el script original se evaluó antes
  const btn = document.getElementById("refreshChannels");
  if (btn) btn.onclick = window.fetchChannels;
})();