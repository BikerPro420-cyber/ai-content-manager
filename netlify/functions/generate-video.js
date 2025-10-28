// netlify/functions/generate-video.js
// Node 18+ has global fetch; you don't need node-fetch. Remove it to avoid bundler headaches.

// Helper: pick the right base URL whether on prod, preview, or local dev (netlify dev)
const getBase = () => {
  // URL = prod site; DEPLOY_PRIME_URL = preview; for local dev we fake localhost:8888
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    `http://localhost:${process.env.PORT || 8888}`
  );
};

const callFn = async (name, payload) => {
  const base = getBase();
  const res = await fetch(`${base}/.netlify/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Call to ${name} failed: ${res.status} ${res.statusText} :: ${text.slice(0, 400)}`
    );
  }
  return res.json();
};

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed. Use POST." })
      };
    }

    const { scenes = [], voiceTrackUrl = "", backgroundSoundUrl = "" } =
      JSON.parse(event.body || "{}");

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Provide scenes: [{ prompt, ... }]" })
      };
    }

    // 1) Render per-scene
    const rendered = await callFn("render-scenes", { scenes });

    // 2) Combine into one video
    const combined = await callFn("combine-scenes", {
      renderedScenes: rendered.renderedScenes
    });

    // 3) Mix voice + background audio
    const mixed = await callFn("mix-audio", {
      videoUrl: combined.combinedVideoUrl,
      voiceTrackUrl,
      backgroundSoundUrl
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mixed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
