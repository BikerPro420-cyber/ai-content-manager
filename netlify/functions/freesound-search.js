/**
 * Generic Freesound search for SFX cues.
 * Requires FREESOUND_API_KEY
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { query, minSec=0.2, maxSec=8 } = JSON.parse(event.body || "{}");
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) return { statusCode: 400, body: "Missing FREESOUND_API_KEY" };
    if (!query) return { statusCode: 400, body: "Missing query" };
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=duration:[${minSec} TO ${maxSec}]&sort=score&fields=id,previews,name,duration&token=${apiKey}&page_size=20`;
    const res = await fetch(url);
    if (!res.ok) return { statusCode: res.status, body: await res.text() };
    const data = await res.json();
    const results = (data.results || []).map(r => ({
      id: r.id, name: r.name, duration: r.duration,
      previewMp3: r.previews["preview-hq-mp3"] || r.previews["preview-lq-mp3"] || null
    }));
    return { statusCode: 200, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
