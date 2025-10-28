(function(){
  function $(id){ return document.getElementById(id); }
  function getScriptText(){
    return ($("scriptOutput")?.value || $("idea")?.value || "").trim();
  }
  function words(str){ return (str.match(/\S+/g)||[]).length; }
  function msToSrtTime(ms){
    const z = (n)=>String(n).padStart(2,"0");
    const h = Math.floor(ms/3600000);
    const m = Math.floor((ms%3600000)/60000);
    const s = Math.floor((ms%60000)/1000);
    const ms3 = String(ms%1000).padStart(3,"0");
    return `${z(h)}:${z(m)}:${z(s)},${ms3}`;
  }

  // Split into "scenes": prefer double newlines, else chunk by ~80–120 words
  function splitScenes(txt){
    let blocks = txt.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean);
    if (blocks.length <= 1){
      const tokens = txt.split(/\s+/).filter(Boolean);
      const out = [];
      let i=0;
      while(i<tokens.length){
        const size = 100 + Math.floor(Math.random()*40); // 100–140 words
        out.push(tokens.slice(i, i+size).join(" "));
        i += size;
      }
      blocks = out;
    }
    return blocks;
  }

  // Build SRT based on ~160 wpm (adjustable)
  function buildSRT(txt, wpm=160){
    const blocks = splitScenes(txt);
    const wpms = wpm/60; // words per second
    let srt = "", idx=1, t=0;
    for(const block of blocks){
      const w = words(block);
      const durSec = Math.max(3, Math.round(w/wpms)); // at least 3s
      const start = msToSrtTime(t*1000);
      const end = msToSrtTime((t+durSec)*1000);
      srt += `${idx}\n${start} --> ${end}\n${block}\n\n`;
      idx++; t += durSec;
    }
    return srt;
  }

  // Build scenes.csv (scene,prompt,durationSeconds)
  function buildScenesCsv(txt, wpm=160){
    const blocks = splitScenes(txt);
    const wpms = wpm/60;
    const rows = [["scene","prompt","durationSeconds"]];
    blocks.forEach((b,i)=>{
      const firstSentence = (b.match(/[^.!?]+[.!?]/)||[b])[0].trim();
      const dur = Math.max(3, Math.round(words(b)/wpms));
      const prompt = `cinematic, atmospheric, high-quality, ${firstSentence}`;
      rows.push([i+1, prompt, dur]);
    });
    return rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  }

  function buildImagePrompts(txt){
    const blocks = splitScenes(txt);
    return blocks.map((b,i)=>{
      const f = (b.match(/[^.!?]+[.!?]/)||[b])[0].trim();
      return `Scene ${i+1}: cinematic, moody lighting, ${f}`;
    }).join("\n");
  }

  function download(filename, content, type="text/plain;charset=utf-8"){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  async function exportZip(files){
    if (!window.JSZip){
      alert("JSZip CDN not loaded. I will download files individually.");
      Object.entries(files).forEach(([name, data])=> download(name, data.content, data.type));
      return;
    }
    const zip = new JSZip();
    for(const [name, data] of Object.entries(files)){
      zip.file(name, data.content);
    }
    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `export_kit_${Date.now()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }

  function ui(){
    if (document.getElementById("exportKitBtn")) return;
    const btn = document.createElement("button");
    btn.id = "exportKitBtn";
    btn.textContent = "📦 Export Kit";
    Object.assign(btn.style, {
      position:"fixed", right:"20px", bottom:"20px", zIndex:9999,
      background:"#1f1f1f", color:"#ffd700", border:"1px solid #333",
      padding:"10px 14px", borderRadius:"8px", cursor:"pointer",
      boxShadow:"0 6px 18px rgba(0,0,0,0.35)", fontWeight:"700"
    });
    document.body.appendChild(btn);

    btn.addEventListener("click", async ()=>{
      const txt = getScriptText();
      if (!txt){ alert("Write or generate a script first."); return; }

      const srt = buildSRT(txt, 160);
      const csv = buildScenesCsv(txt, 160);
      const prompts = buildImagePrompts(txt);

      // Files:
      const files = {
        "script.txt": {content: txt, type:"text/plain;charset=utf-8"},
        "captions.srt": {content: srt, type:"text/plain;charset=utf-8"},
        "scenes.csv": {content: csv, type:"text/csv;charset=utf-8"},
        "image_prompts.txt": {content: prompts, type:"text/plain;charset=utf-8"}
      };

      // Quick actions: clipboard copies
      try {
        await navigator.clipboard.writeText(txt);
      } catch(e){ /* ignore */ }

      // ZIP if possible; else individual
      exportZip(files);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ui);
  else ui();
})();