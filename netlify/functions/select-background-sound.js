/**
 * Fetch a Freesound ambient loop for a given tag.
 * Requires FREESOUND_API_KEY
 */
exports.handler = async (event) => {
  try {
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) return { statusCode: 400, body: "Missing FREESOUND_API_KEY" };
    const qs = new URLSearchParams(event.queryStringParameters || {});
    const tag = qs.get("tag") || "dark atmospheres";
    const page_size = 10;

    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(tag)}&filter=duration:[10 TO 600]&sort=score&fields=id,previews,name,duration&token=${apiKey}&page_size=${page_size}`;
    const res = await fetch(url);
    if (!res.ok) return { statusCode: res.status, body: await res.text() };
    const data = await res.json();
    if (!data.results || !data.results.length) return { statusCode: 404, body: "No ambient results" };
    // choose first result with mp3 preview
    const item = data.results.find(x => x.previews && x.previews["preview-hq-mp3"]) || data.results[0];
    const ambientUrl = item.previews["preview-hq-mp3"] || item.previews["preview-lq-mp3"];
    return { statusCode: 200, body: JSON.stringify({ ambientUrl, id: item.id, name: item.name, duration: item.duration }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
