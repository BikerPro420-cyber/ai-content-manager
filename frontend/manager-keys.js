(function(){
  const S = (k,v)=>localStorage.setItem(k,v||"");
  const G = (k)=>localStorage.getItem(k)||"";

  // expone para otros scripts
  window.getKeys = function(){
    return {
      openrouter: G("orKey"),
      replicate:  G("replicateKey"),
      freesound:  G("freesoundKey"),
    };
  };

  function renderPanel(){
    const aside = document.querySelector("aside");
    if(!aside || document.getElementById("apiKeysToggle")) return;

    const toggle = document.createElement("button");
    toggle.id = "apiKeysToggle";
    toggle.textContent = "🔐 API Keys";
    toggle.className = "";
    aside.insertBefore(toggle, aside.children[1] || null);

    const box = document.createElement("div");
    box.id = "apiKeysPanel";
    box.style.display = "none";
    box.style.background = "#101010";
    box.style.border = "1px solid #222";
    box.style.borderRadius = "6px";
    box.style.padding = "10px";
    box.style.marginTop = "8px";
    box.innerHTML = `
      <div style="font-weight:700;color:#ffb300;margin-bottom:6px;">Configurar APIs</div>
      <label style="display:block;margin:6px 0 3px 0;">OpenRouter Key</label>
      <input id="orKey" type="password" placeholder="sk-or-..." style="width:100%;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#f5f5f5;" />
      <label style="display:block;margin:10px 0 3px 0;">Replicate Key</label>
      <input id="repKey" type="password" placeholder="r8_..." style="width:100%;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#f5f5f5;" />
      <label style="display:block;margin:10px 0 3px 0;">Freesound Key</label>
      <input id="fsKey" type="password" placeholder="fs-..." style="width:100%;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#f5f5f5;" />
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button id="saveKeys" style="flex:1;background:#1f1f1f;color:#f5f5f5;border:1px solid #333;border-radius:6px;padding:8px;">💾 Guardar</button>
        <button id="clearKeys" style="flex:1;background:#3a1b1b;color:#fff;border:1px solid #333;border-radius:6px;padding:8px;">🧹 Limpiar</button>
      </div>
      <small id="keysStatus" style="display:block;margin-top:8px;color:#aaa;"></small>
    `;
    aside.insertBefore(box, aside.children[2] || null);

    // load
    box.querySelector("#orKey").value = G("orKey");
    box.querySelector("#repKey").value = G("replicateKey");
    box.querySelector("#fsKey").value = G("freesoundKey");

    toggle.onclick = ()=> {
      box.style.display = (box.style.display === "none") ? "block" : "none";
    };
    box.querySelector("#saveKeys").onclick = ()=>{
      S("orKey", box.querySelector("#orKey").value.trim());
      S("replicateKey", box.querySelector("#repKey").value.trim());
      S("freesoundKey", box.querySelector("#fsKey").value.trim());
      box.querySelector("#keysStatus").textContent = "✅ Keys guardadas (localStorage).";
    };
    box.querySelector("#clearKeys").onclick = ()=>{
      ["orKey","replicateKey","freesoundKey"].forEach(k=>localStorage.removeItem(k));
      box.querySelector("#orKey").value = "";
      box.querySelector("#repKey").value = "";
      box.querySelector("#fsKey").value = "";
      box.querySelector("#keysStatus").textContent = "🧹 Keys borradas.";
    };
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", renderPanel) : renderPanel();
})();