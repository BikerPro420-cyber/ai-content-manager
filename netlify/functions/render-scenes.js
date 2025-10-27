import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const { scenes } = JSON.parse(event.body);
    const outputs = [];

    for (const scene of scenes) {
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          version: "ffmpeg-model-version-id",
          input: {
            prompt: scene.prompt,
            duration: scene.duration || 10,
            resolution: "1080p",
            style: scene.style || "cinematic"
          }
        })
      });

      const data = await response.json();
      outputs.push(data.output?.[0] || null);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ renderedScenes: outputs })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
