/**
 * Appends a row to Google Sheets.
 * Either provide accessToken (OAuth user) or a service account (GOOGLE_SA_CLIENT_EMAIL, GOOGLE_SA_PRIVATE_KEY).
 */
const jwt = require("jsonwebtoken");

async function getServiceAccountToken() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const now = Math.floor(Date.now()/1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600
  };
  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: token })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.access_token;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { spreadsheetId, range="Sheet1!A1", values=[["timestamp", new Date().toISOString()]], accessToken=null } = JSON.parse(event.body || "{}");
    if (!spreadsheetId) return { statusCode: 400, body: "Missing spreadsheetId" };
    let token = accessToken;
    if (!token) token = await getServiceAccountToken();
    if (!token) return { statusCode: 400, body: "Missing accessToken and no service account configured" };

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ values })
    });
    if (!res.ok) return { statusCode: res.status, body: await res.text() };
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: String(err.stack || err) };
  }
};
