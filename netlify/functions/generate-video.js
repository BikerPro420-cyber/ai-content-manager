import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const { scenes, voiceTrackUrl, backgroundSoundUrl } = JSON.parse(event.body);

    const rendered = await fetch("/.netlify/functions/render-scenes", {
      method: "POST",
      body: JSON.stringify({ scenes })
    }).then(res => res.json());

    const combined = await fetch("/.netlify/functions/combine-scenes", {
      method: "POST",
      body: JSON.stringify({ renderedScenes: rendered.renderedScenes })
    }).then(res => res.json());

    const mixed = await fetch("/.netlify/functions/mix-audio", {
      method: "POST",
      body: JSON.stringify({
        videoUrl: combined.combinedVideoUrl,
        voiceTrackUrl,
        backgroundSoundUrl
      })
    }).then(res => res.json());

    return { statusCode: 200, body: JSON.stringify(mixed) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
