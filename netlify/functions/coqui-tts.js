/**
 * Coqui Studio TTS (optional, requires COQUI_API_TOKEN and a voice_id).
 * If not configured, returns 400.
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { text, voice_id, format="mp3" } = JSON.parse(event.body || "{}");
    const token = process.env.COQUI_API_TOKEN;
    if (!token) return { statusCode: 400, body: "Missing COQUI_API_TOKEN" };
    if (!text || !voice_id) return { statusCode: 400, body: "Missing text or voice_id" };

    // Coqui Studio API (subject to change). Example endpoint:
    const resp = await fetch(`https://app.coqui.ai/api/v2/samples`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id, format })
    });
    if (!resp.ok) return { statusCode: resp.status, body: await resp.text() };
    const data = await resp.json();
    const audioUrl = data?.audio_url || data?.url;
    if (!audioUrl) return { statusCode: 500, body: "No audioUrl from Coqui" };
    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ audioUrl }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
