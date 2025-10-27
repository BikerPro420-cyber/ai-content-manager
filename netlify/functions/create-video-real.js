const fs = require("fs");
const path = require("path");
const { downloadToFile } = require("./_lib/download");
const { buildSceneVideos, concatScenes, makeAudioMix, mux, makeTemp } = require("./_lib/ffmpeg");
const { maybeUploadS3 } = require("./_lib/storage");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const payload = JSON.parse(event.body || "{}");
    const { title="Untitled", scenes=[], voiceUrl, ambientUrl=null, sfx=[] } = payload;
    if (!voiceUrl) return { statusCode: 400, body: "Missing voiceUrl" };
    if (!Array.isArray(scenes) || scenes.length === 0) return { statusCode: 400, body: "Missing scenes[]" };

    // 1) Download assets to /tmp
    const voicePath = makeTemp("voice.mp3");
    await downloadToFile(voiceUrl, voicePath);
    let ambientPath = null;
    if (ambientUrl) {
      ambientPath = makeTemp("ambient.mp3");
      await downloadToFile(ambientUrl, ambientPath);
    }
    const sfxPaths = [];
    for (const item of (sfx||[])) {
      if (!item?.url) continue;
      const p = makeTemp(`sfx_${Math.random().toString(36).slice(2)}.mp3`);
      await downloadToFile(item.url, p);
      sfxPaths.push({ path: p, startMs: Math.max(0, Math.floor((item.startSec||0)*1000)), gain: item.gain ?? 1.0 });
    }

    // 2) Download scene images & build per-scene videos
    const sceneInputs = [];
    let idx = 0;
    for (const sc of scenes) {
      if (!sc.imageUrl || !sc.durationSec) continue;
      const p = makeTemp(`scene_${idx}.jpg`);
      await downloadToFile(sc.imageUrl, p);
      sceneInputs.push({ imagePath: p, duration: Math.max(1, Math.floor(sc.durationSec)) });
      idx++;
    }
    if (!sceneInputs.length) return { statusCode: 400, body: "No valid scene images" };
    const sceneVideos = await buildSceneVideos(sceneInputs);
    const videoConcat = await concatScenes(sceneVideos);

    // 3) Build audio mix
    const audioMix = await makeAudioMix({ voicePath, ambientPath, sfx: sfxPaths });

    // 4) Mux final
    const output = await mux(videoConcat, audioMix);

    // 5) Upload if S3 configured
    const s3Url = await maybeUploadS3(output, "video/mp4");
    if (s3Url) {
      return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ url: s3Url, title }) };
    }

    // 6) If no storage configured, return 409 with note (no fake URLs)
    return { statusCode: 409, body: "Storage not configured (set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) to receive a URL. Composition succeeded server-side." };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
