/**
 * Analyze script text and suggest ambient + sfx tags.
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { scriptText="" } = JSON.parse(event.body || "{}");
    const text = (scriptText || "").toLowerCase();
    const tags = [];
    if (text.includes("rain")) tags.push("rain");
    if (text.includes("wind")) tags.push("wind");
    if (text.includes("forest")) tags.push("forest");
    if (text.includes("whisper")) tags.push("whisper");
    if (text.includes("thunder")) tags.push("thunder");
    if (text.includes("footsteps")) tags.push("footsteps");
    return { statusCode: 200, body: JSON.stringify({ tags, recommendedAmbient: tags[0] || "dark atmospheres" }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
