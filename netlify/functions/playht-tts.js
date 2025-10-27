/**
 * Real PlayHT v2 TTS
 * Requires: PLAYHT_API_KEY, PLAYHT_USER_ID
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { text, voice="s3://voice-cloning-zero-shot/rohit-2023-09-13", format="mp3" } = JSON.parse(event.body || "{}");
    const apiKey = process.env.PLAYHT_API_KEY;
    const userId = process.env.PLAYHT_USER_ID;
    if (!apiKey || !userId) return { statusCode: 400, body: "Missing PLAYHT_API_KEY or PLAYHT_USER_ID" };
    if (!text) return { statusCode: 400, body: "Missing text" };

    const resp = await fetch("https://api.play.ht/api/v2/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-User-Id": userId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text, voice, format, quality: "medium" })
    });
    if (!resp.ok) return { statusCode: resp.status, body: await resp.text() };
    const data = await resp.json();
    const id = data?.id;
    // Poll
    let audioUrl = null;
    for (let i=0;i<120;i++) {
      const r = await fetch(`https://api.play.ht/api/v2/tts/${id}`,
        { headers: { "Authorization": `Bearer ${apiKey}`, "X-User-Id": userId } }
      );
      const j = await r.json();
      if (j?.status === "complete" && j?.audioUrl) { audioUrl = j.audioUrl; break; }
      if (j?.status === "failed") return { statusCode: 500, body: "PlayHT TTS failed" };
      await new Promise(res => setTimeout(res, 2000));
    }
    if (!audioUrl) return { statusCode: 504, body: "TTS timeout" };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioUrl }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
