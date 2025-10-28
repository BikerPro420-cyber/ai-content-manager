(function(){
  function addDetails(section, title, innerHTML){
    if(!section) return;
    const d = document.createElement("details");
    d.style.background = "#121212";
    d.style.border = "1px solid #222";
    d.style.borderRadius = "6px";
    d.style.padding = "8px";
    d.style.marginTop = "8px";
    const s = document.createElement("summary");
    s.textContent = title;
    s.style.cursor = "pointer";
    s.style.color = "#ffb300";
    s.style.fontWeight = "700";
    d.appendChild(s);
    const c = document.createElement("div");
    c.innerHTML = innerHTML;
    c.style.marginTop = "8px";
    d.appendChild(c);
    section.appendChild(d);
  }

  const quick = Array.from(document.querySelectorAll(".section")).find(x => x.querySelector("h2")?.textContent?.includes("Quick Actions"));
  addDetails(quick, "Opciones de Script", `
    <div class="flex-row">
      <button class="action-btn" onclick="console.log('style: documental')">Documental</button>
      <button class="action-btn" onclick="console.log('style: narrativo')">Narrativo</button>
      <button class="action-btn" onclick="console.log('style: top10')">Top 10</button>
      <button class="action-btn" onclick="console.log('lang: es')">Español</button>
      <button class="action-btn" onclick="console.log('lang: en')">English</button>
    </div>
  `);
  addDetails(quick, "Opciones de Imagen/Video", `
    <div class="flex-row">
      <button class="action-btn" onclick="console.log('img model: flux')">FLUX (Replicate)</button>
      <button class="action-btn" onclick="console.log('img model: sd3')">SD3</button>
      <button class="action-btn" onclick="console.log('video mode: slideshow')">Slideshow</button>
      <button class="action-btn" onclick="console.log('video mode: reels')">Reel</button>
    </div>
  `);
  addDetails(quick, "Voz / Audio", `
    <div class="flex-row">
      <button class="action-btn" onclick="console.log('voice: female_es')">Voz ES Femenina</button>
      <button class="action-btn" onclick="console.log('voice: male_es')">Voz ES Masculina</button>
      <button class="action-btn" onclick="console.log('bg: ambient')">Ambient</button>
      <button class="action-btn" onclick="console.log('bg: tension')">Tensión</button>
    </div>
  `);

  const anal = document.getElementById("analyticsSection");
  addDetails(anal, "Filtros de Analytics", `
    <div class="flex-row">
      <button class="action-btn" onclick="console.log('range: 24h')">24h</button>
      <button class="action-btn" onclick="console.log('range: 7d')">7 días</button>
      <button class="action-btn" onclick="console.log('range: 30d')">30 días</button>
    </div>
  `);

  const res = Array.from(document.querySelectorAll(".section")).find(x => x.querySelector("h2")?.textContent?.includes("Resource Monitor"));
  addDetails(res, "Checks avanzados", `
    <div class="flex-row">
      <button class="action-btn" onclick="window.checkResources && window.checkResources()">Re-chequear</button>
      <button class="action-btn" onclick="console.log('ping freesound')">Ping Freesound</button>
      <button class="action-btn" onclick="console.log('ping replicate')">Ping Replicate</button>
    </div>
  `);

  const trends = document.getElementById("trendsSection");
  addDetails(trends, "Fuentes", `
    <div class="flex-row">
      <button class="action-btn" onclick="window.fetchTrends && window.fetchTrends('global')">Global</button>
      <button class="action-btn" onclick="window.fetchTrends && window.fetchTrends('youtube')">YouTube</button>
      <button class="action-btn" onclick="window.fetchTrends && window.fetchTrends('twitter')">X/Twitter</button>
    </div>
  `);
})();