/**
 * Calls Replicate to generate a cinematic image and returns the URL.
 * Requires REPLICATE_API_TOKEN and either `version` (versionId) or `model` + `version`.
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return { statusCode: 400, body: "Missing REPLICATE_API_TOKEN" };
    const { prompt, model="black-forest-labs/flux-1.1-pro", version=null, width=1024, height=576 } = JSON.parse(event.body || "{}");
    if (!prompt) return { statusCode: 400, body: "Missing prompt" };

    // Create prediction
    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${token}`
      },
      body: JSON.stringify({
        version, // if null, Replicate will use default version for the model
        input: { prompt, width, height, num_outputs: 1 },
        model
      })
    });
    if (!create.ok) return { statusCode: create.status, body: await create.text() };
    const created = await create.json();

    // Poll
    let pred = created;
    const url = created.urls?.get;
    for (let i=0;i<120;i++) {
      const r = await fetch(url, { headers: { "Authorization": `Token ${token}` }});
      pred = await r.json();
      if (pred.status === "succeeded") break;
      if (pred.status === "failed" || pred.status === "canceled") break;
      await new Promise(res => setTimeout(res, 2000));
    }
    if (pred.status !== "succeeded") {
      return { statusCode: 500, body: `Replicate failed: ${pred.status} - ${JSON.stringify(pred.error || {})}` };
    }
    const imageUrl = pred.output?.[0];
    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ imageUrl, predictionId: pred.id }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
