exports.handler = async () => {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return { statusCode: 400, body: "Missing REPLICATE_API_TOKEN" };
    const res = await fetch("https://api.replicate.com/v1/trainings", { // lightweight auth check
      headers: { "Authorization": `Token ${token}` }
    });
    return { statusCode: 200, body: JSON.stringify({ ok: res.status === 200 || res.status === 404 }) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
