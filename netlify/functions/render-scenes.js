// Netlify Function: render-scenes
// Renderiza escenas en Replicate con polling robusto.
// Requisitos de entorno (Netlify > Site settings > Environment variables):
//   REPLICATE_API_TOKEN       -> tu token de Replicate (obligatorio)
//   REPLICATE_MODEL_VERSION   -> ID de versión del modelo en Replicate (obligatorio)
//                                (ej. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')

import fetch from "node-fetch";

// Usa fetch nativo si existe; si no, cae a node-fetch
const doFetch = (...args) => (globalThis.fetch ? globalThis.fetch(...args) : fetch(...args));

// Helpers
const json = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Use POST" });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    const version = process.env.REPLICATE_MODEL_VERSION;

    if (!token) {
      return json(400, { error: "Missing REPLICATE_API_TOKEN env var" });
    }
    if (!version) {
      return json(400, {
        error: "Missing REPLICATE_MODEL_VERSION env var",
        hint: "En Netlify, define REPLICATE_MODEL_VERSION con el ID de versión del modelo que quieres usar.",
      });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const scenes = Array.isArray(body.scenes) ? body.scenes : [];
    if (scenes.length === 0) {
      return json(400, { error: "Provide 'scenes' as a non-empty array" });
    }

    // Render secuencial con polling
    const renderedScenes = [];
    for (const [idx, scene] of scenes.entries()) {
      const prompt = (scene?.prompt || "").toString().trim();
      if (!prompt) {
        return json(400, { error: Scene  is missing 'prompt' });
      }

      // Heurística simple: frames = duración(seg)*fps(=8), acotado [16,256]
      const fps = Number.isFinite(scene?.fps) ? Math.max(1, Math.min(24, Math.floor(scene.fps))) : 8;
      const durationSec = Number.isFinite(scene?.duration) ? Math.max(2, Math.min(32, Math.floor(scene.duration))) : 8;
      const num_frames = Math.max(16, Math.min(256, durationSec * fps));

      // Crea predicción
      const createRes = await doFetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: Token ,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version,
          input: {
            prompt,
            fps,
            num_frames,
            // Campos opcionales comunes (ajústalos si tu modelo los soporta)
            negative_prompt: scene?.negativePrompt || undefined,
            seed: Number.isFinite(scene?.seed) ? scene.seed : undefined,
            // Algunos modelos aceptan 'width'/'height' o 'resolution'
            width: scene?.width || undefined,
            height: scene?.height || undefined,
          },
        }),
      });

      if (!createRes.ok) {
        const txt = await createRes.text();
        return json(400, { error: "Replicate create prediction failed", details: txt });
      }

      const created = await createRes.json();
      const predId = created?.id;
      if (!predId) {
        return json(400, { error: "Replicate did not return a prediction id", raw: created });
      }

      // Polling
      let status = created?.status || "starting";
      let outputUrl = null;
      const startedAt = Date.now();
      const timeoutMs = 1000 * 60 * 4; // 4 min por escena

      while (true) {
        // timeout
        if (Date.now() - startedAt > timeoutMs) {
          return json(504, { error: Timeout waiting for scene  prediction, prediction: predId });
        }

        const getRes = await doFetch(https://api.replicate.com/v1/predictions/, {
          headers: { Authorization: Token  },
        });

        if (!getRes.ok) {
          const txt = await getRes.text();
          return json(400, { error: "Replicate polling failed", details: txt, prediction: predId });
        }

        const current = await getRes.json();
        status = current?.status;

        if (status === "succeeded") {
          // 'output' puede ser array de URLs o un solo URL según el modelo
          const out = current?.output;
          if (Array.isArray(out)) {
            outputUrl = out[out.length - 1] || out[0] || null;
          } else {
            outputUrl = out || null;
          }
          break;
        }

        if (status === "failed" || status === "canceled") {
          return json(400, { error: Prediction  for scene , prediction: predId, raw: current });
        }

        // backoff simple
        await sleep(2000);
      }

      if (!outputUrl) {
        return json(400, { error: "Prediction finished but no output URL", prediction: predId });
      }

      renderedScenes.push({
        index: idx,
        prompt,
        fps,
        duration: durationSec,
        num_frames,
        url: outputUrl,
        predictionId: predId,
      });
    }

    return json(200, { renderedScenes });
  } catch (err) {
    return json(500, { error: err?.message || String(err) });
  }
};