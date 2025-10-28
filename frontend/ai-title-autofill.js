(function(){
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("generateTitleBtn");
    const apiKeyEl = document.getElementById("apiKey");
    const ideaEl = document.getElementById("idea");
    const titleEl = document.getElementById("videoTitle");
    const genreEl = document.getElementById("genre");
    const langEl  = document.getElementById("language");
    const previewBox = document.getElementById("autoTitlePreview");
    const suggested  = document.getElementById("suggestedTitle");
    const useBtn     = document.getElementById("useSuggestedTitle");

    if (!btn) return;

    btn.onclick = async () => {
      const apiKey = (apiKeyEl?.value || "").trim();
      if (!apiKey) { alert("❌ Introduce tu OpenRouter API Key"); return; }

      const idea = (ideaEl?.value || "").trim();
      const genre = genreEl?.value || "Horror";
      const language = langEl?.value || "Español";

      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = "🔄 Generando título...";

      try {
        const res = await fetch("/.netlify/functions/generate-idea", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            apiKey,
            genre,
            language,
            generateTitleOnly: true,
            idea
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || res.statusText);

        const title = data?.title || data?.idea || `Video ${new Date().toLocaleDateString()} - ${genre}`;
        if (titleEl) titleEl.value = title;

        if (previewBox && suggested) {
          suggested.textContent = title;
          previewBox.style.display = "block";
        }

      } catch (e) {
        console.error(e);
        alert("❌ Error al generar título: " + e.message);
      } finally {
        btn.textContent = prev;
        btn.disabled = false;
      }
    };

    if (useBtn && suggested && titleEl) {
      useBtn.onclick = () => {
        titleEl.value = suggested.textContent || titleEl.value;
        if (previewBox) previewBox.style.display = "none";
      };
    }
  });
})();