/* keys-shim: keep UI, add keys + smart fetch */
(function(){
  const LS = "studioCfg";
  const $ = s => document.querySelector(s);
  const load = () => { try { return Object.assign({
    openrouter:"", replicate:"",
    sheetId:"1fkNcw3Av6DYxEG57WPbw54Tl-NyJQC5BMjyafCb547k",
    sheetName:"Videos"
  }, JSON.parse(localStorage.getItem(LS)||"{}")); } catch { return {openrouter:"",replicate:"",sheetId:"",sheetName:"Videos"} } };
  const save = (c)=> localStorage.setItem(LS, JSON.stringify(c));

  // Floating gear + modal
  const css = `
  #ks-gear{position:fixed;right:16px;bottom:16px;z-index:9999;background:#1b1b1f;color:#ffd166;
    border:1px solid #2a2a39;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35)}
  #ks-gear:hover{transform:translateY(-1px)}
  #ks-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;place-items:center;z-index:10000}
  #ks-card{width:min(680px,92vw);background:#0f0f15;border:1px solid #24243a;border-radius:16px;padding:16px}
  #ks-card h3{margin:0 0 8px;color:#ffb300}
  #ks-grid{display:grid;gap:8px}
  #ks-grid input{background:#13131b;border:1px solid #2a2a39;color:#e8e8f3;border-radius:10px;padding:10px 12px}
  #ks-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
  #ks-actions button{border:0;border-radius:10px;padding:8px 12px;font-weight:800}
  #ks-save{background:#22d68f;color:#05251a}
  #ks-close{background:#1c1c24;color:#e8e8f3;border:1px solid #2a2a39}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
  const modal = document.createElement("div");
  modal.id = "ks-modal";
  modal.innerHTML = `
    <div id="ks-card">
      <h3>🔑 Keys & Google Sheet</h3>
      <div id="ks-grid">
        <input id="ks-or" placeholder="OpenRouter API (sk-or-…)" />
        <input id="ks-rep" placeholder="Replicate Token (r8_…)" />
        <input id="ks-id" placeholder="Google Sheet ID" />
        <input id="ks-name" placeholder="Sheet Name" />
      </div>
      <div id="ks-actions">
        <button id="ks-close">Close</button>
        <button id="ks-save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const gear = document.createElement("button"); gear.id="ks-gear"; gear.textContent="⚙️ Keys"; document.body.appendChild(gear);

  const cfg = load();
  $("#ks-or").value = cfg.openrouter||"";
  $("#ks-rep").value = cfg.replicate||"";
  $("#ks-id").value = cfg.sheetId||"";
  $("#ks-name").value = cfg.sheetName||"Videos";

  gear.onclick = ()=> modal.style.display="grid";
  $("#ks-close").onclick = ()=> modal.style.display="none";
  $("#ks-save").onclick = ()=>{
    const c = {
      openrouter: $("#ks-or").value.trim(),
      replicate: $("#ks-rep").value.trim(),
      sheetId: $("#ks-id").value.trim(),
      sheetName: $("#ks-name").value.trim() || "Videos"
    };
    save(c);
    modal.style.display="none";
    alert("✅ Keys saved");
  };

  // Expose for other scripts if needed
  window.getStudioCfg = ()=> load();

  // Smart fetch patch: inject keys + fix method for Sheets
  const ofetch = window.fetch.bind(window);
  window.fetch = async (input, init={})=>{
    try{
      const url = (typeof input==="string") ? input : (input?.url||"");
      if (url.includes("/.netlify/functions/")) {
        const c = load();
        let body = {};
        let headers = Object.assign({"Content-Type":"application/json"}, init.headers||{});

        if (init.body) { try{ body = JSON.parse(init.body); }catch{} }

        // Ensure POST to avoid 405s
        const needPost = [
          "google-sheets","sheets-read","generate-idea","generate-script",
          "generate-image","generate-video","validate-replicate","ambient-plan"
        ].some(p=> url.includes("/.netlify/functions/"+p));
        if (needPost && (!init.method || init.method.toUpperCase()!=="POST")) init.method="POST";

        // Inject keys per function
        if (url.includes("/generate-idea") || url.includes("/generate-script")) {
          if (!body.apiKey && c.openrouter) body.apiKey = c.openrouter;
        }
        if (url.includes("/generate-image") || url.includes("/validate-replicate")) {
          if (!body.replicateKey && c.replicate) body.replicateKey = c.replicate;
        }
        // Sheets read helper
        if (url.includes("/google-sheets") || url.includes("/sheets-read")) {
          if (!body.sheetId && c.sheetId) body.sheetId = c.sheetId;
          if (!body.sheetName && c.sheetName) body.sheetName = c.sheetName;
          if (!body.action) body.action = "read";
        }

        init.headers = headers;
        init.body = JSON.stringify(body);
      }
    }catch(e){ /* best effort */ }
    return ofetch(input, init);
  };
})();
