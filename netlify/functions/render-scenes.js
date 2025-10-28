export const handler = async (event) => {
  const json = (code, obj) => ({
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Use POST" });
    }

    const body = JSON.parse(event.body || "{}");
    const scenes = Array.isArray(body.scenes) ? body.scenes : [];
    if (scenes.length === 0) {
      return json(400, { error: "scenes[] requerido" });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return json(400, { error: "Falta REPLICATE_API_TOKEN (configúralo en Netlify)" });
    }

    // NOTA: Sin conocer la versión exacta del modelo, devolvemos error detallado si falla.
    // Cambia MODEL_VERSION por una válida cuando tengamos el detalle del error.
    const MODEL_VERSION = body.version || "black-forest-labs/flux-schnell"; // placeholder

    const out = [];
    for (let idx = 0; idx < scenes.length; idx++) {
      const scene = scenes[idx] || {};
      const prompt = scene.prompt || "cinematic still frame, dramatic lighting";
      const duration = scene.duration || 4;

      // 1) Crear predicción
      const createRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: MODEL_VERSION,       // si esto no es válido, veremos el detalle abajo
          input: {
            prompt,
            // muchos modelos de imagen ignoran 'duration'; lo dejamos aquí por compatibilidad
            duration
          },
        }),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        return json(400, {
          error: "Replicate API error (create prediction)",
          status: createRes.status,
          details: safeText(text),
          hint: "Revisa que 'version' sea un ID de versión válido del modelo en Replicate.",
        });
      }

      const created = await createRes.json();
      if (!created?.urls?.get) {
        return json(400, { error: "Respuesta inesperada de Replicate (sin urls.get)", created });
      }

      // 2) Polling hasta terminar
      let resultUrl = null;
      for (let tries = 0; tries < 40; tries++) {
        const pollRes = await fetch(created.urls.get, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!pollRes.ok) {
          const text = await pollRes.text();
          return json(400, {
            error: "Replicate API error (poll)",
            status: pollRes.status,
            details: safeText(text),
          });
        }
        const poll = await pollRes.json();

        if (poll.status === "succeeded") {
          // Algunos modelos devuelven array, otros una sola url.
          const outUrl = Array.isArray(poll.output) ? poll.output[0] : poll.output;
          resultUrl = outUrl || null;
          break;
        }
        if (poll.status === "failed" || poll.status === "canceled") {
          return json(400, { error: "Replicate job failed", info: poll });
        }
        await sleep(1500);
      }

      out.push(resultUrl);
    }

    return json(200, { renderedScenes: out });
  } catch (e) {
    return json(500, { error: e.message, stack: e.stack });
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function safeText(t) {
  try { return JSON.parse(t); } catch { return t; }
}