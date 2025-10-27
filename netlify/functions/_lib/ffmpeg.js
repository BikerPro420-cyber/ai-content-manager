const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function initFFmpeg() {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
}

function makeTemp(name) {
  const p = path.join("/tmp", name);
  return p;
}

/**
 * Build per-scene silent video segments from images.
 * @param {Array<{imagePath:string, duration:number}>} scenes
 * @returns {Promise<string[]>} paths to scene*.mp4
 */
async function buildSceneVideos(scenes) {
  initFFmpeg();
  const outputs = [];
  for (let i=0; i<scenes.length; i++) {
    const { imagePath, duration } = scenes[i];
    const out = makeTemp(`scene_${i}.mp4`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .addInput(imagePath)
        .inputOptions(["-loop 1"])
        .videoFilters([
          // scale to 1080p (letterbox if needed)
          "scale=1920:1080:force_original_aspect_ratio=decrease",
          "pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        ])
        .addOutputOptions([
          "-t", String(duration),
          "-r", "30",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-preset", "veryfast",
          "-tune", "stillimage"
        ])
        .save(out)
        .on("end", resolve)
        .on("error", reject);
    });
    outputs.push(out);
  }
  return outputs;
}

/**
 * Concatenate scene mp4s into a single video stream using concat demuxer.
 * @param {string[]} sceneVideos 
 * @returns {Promise<string>} path to concatenated video
 */
async function concatScenes(sceneVideos) {
  initFFmpeg();
  const listPath = makeTemp("concat_list.txt");
  fs.writeFileSync(listPath, sceneVideos.map(p => `file '${p}'`).join("\n"));
  const out = makeTemp("video_concat.mp4");
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .addOutputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p"])
      .save(out)
      .on("end", resolve)
      .on("error", reject);
  });
  return out;
}

/**
 * Mix voice + ambient + sfx into single audio track.
 * @param {string} voicePath wav/mp3
 * @param {string|null} ambientPath wav/mp3
 * @param {Array<{path:string, startMs:number, gain:number}>} sfx
 * @returns {Promise<string>} out audio path (m4a)
 */
async function makeAudioMix({ voicePath, ambientPath=null, sfx=[] }) {
  initFFmpeg();
  const out = makeTemp("audio_mix.m4a");
  const cmd = ffmpeg();
  cmd.input(voicePath);

  if (ambientPath) cmd.input(ambientPath);
  sfx.forEach(s => cmd.input(s.path));

  // Build filter graph
  // Start with voice at full volume
  let filter = `[0:a]aloop=loop=0:size=2e+09,aresample=48000,volume=1.0[a0];`;
  let inputs = 1;
  if (ambientPath) {
    filter += `[1:a]aresample=48000,volume=0.35[a1];`;
    inputs += 1;
  }
  sfx.forEach((s, idx) => {
    const inIdx = ambientPath ? (2+idx) : (1+idx);
    const tag = `s${idx}`;
    filter += `[${inIdx}:a]adelay=${Math.max(0, s.startMs)}|${Math.max(0, s.startMs)},aresample=48000,volume=${s.gain ?? 1.0}[${tag}];`;
  });

  const mixInputs = ["[a0]"];
  if (ambientPath) mixInputs.push("[a1]");
  sfx.forEach((_, idx) => mixInputs.push(`[s${idx}]`));

  filter += `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0,volume=1.0,aresample=48000[aout]`;

  await new Promise((resolve, reject) => {
    cmd.complexFilter(filter, ["aout"])
      .outputOptions(["-map", "[aout]", "-c:a", "aac", "-b:a", "192k"])
      .save(out)
      .on("end", resolve)
      .on("error", reject);
  });
  return out;
}

/**
 * Mux concatenated video with mixed audio.
 * @param {string} videoPath 
 * @param {string} audioPath 
 * @returns {Promise<string>} output mp4
 */
async function mux(videoPath, audioPath) {
  initFFmpeg();
  const out = makeTemp("output.mp4");
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .addOutputOptions([
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest"
      ])
      .save(out)
      .on("end", resolve)
      .on("error", reject);
  });
  return out;
}

module.exports = { buildSceneVideos, concatScenes, makeAudioMix, mux, makeTemp, initFFmpeg };
