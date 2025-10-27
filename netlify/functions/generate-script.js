exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { idea, language="en", minutes=20 } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { statusCode: 400, body: "Missing OPENROUTER_API_KEY" };
    if (!idea) return { statusCode: 400, body: "Missing idea" };

    const prompt = `Turn this horror concept into a full script, with scene blocks and cues for sound effects.
Return JSON with: title, description, language, scenes:[{text, durationSec, imagePrompt, sfx:[{keyword, startSec, gain}]}].
Respect target length ${minutes} minutes. Idea:\n` + JSON.stringify(idea);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://example.com",
        "X-Title": "Scary Story Machine"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    if (!res.ok) return { statusCode: res.status, body: await res.text() };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "{}";
    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: text };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
