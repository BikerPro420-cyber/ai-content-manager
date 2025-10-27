exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { genre="horror", language="en", minLength=120, constraints={} } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { statusCode: 400, body: "Missing OPENROUTER_API_KEY" };

    const prompt = `You are a horror ideation engine. Create a single original scary story concept with a viral YouTube title.
Output JSON with keys: title, logline, beats[] (5-9 bullet beats), content_warnings[], locales[], language.
Constraints: genre=${genre}, language=${language}, target_minutes=20, min_words=${minLength}.`;

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
        temperature: 0.8
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: res.status, body: t };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "{}";
    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: text };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
