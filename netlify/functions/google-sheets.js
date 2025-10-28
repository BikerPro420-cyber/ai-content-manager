const jwt = require("jsonwebtoken");

const cors = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  },
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors.headers, body: "" };
  }

  try {
    const qs = event.queryStringParameters || {};
    const isPost = event.httpMethod === "POST";
    const body = isPost && event.body ? JSON.parse(event.body) : {};
    const action = (body.action || qs.action || "").toLowerCase();

    const SHEET_ID   = body.sheetId   || process.env.GOOGLE_SHEET_ID;
    const SHEET_NAME = body.sheetName || process.env.GOOGLE_SHEET_NAME || "Videos";

    // --- diag: no expone secretos, solo presencia ---
    if (action === "diag") {
      const email = process.env.GOOGLE_SVC_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "";
      let key = process.env.GOOGLE_SVC_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || "";
      return json(200, {
        ok: true,
        hasSheetId: !!SHEET_ID,
        sheetIdHint: SHEET_ID ? `${SHEET_ID.slice(0,6)}...${SHEET_ID.slice(-4)}` : null,
        sheetName: SHEET_NAME,
        hasEmail: !!email,
        emailDomain: email ? email.split("@")[1] : null,
        hasKey: !!key,
        keyLen: key ? key.length : 0,
      });
    }

    if (action === "ping") {
      return json(200, { ok: true, sheetId: !!SHEET_ID, sheetName: SHEET_NAME });
    }

    if (action !== "listchannels") {
      return json(400, { error: 'Invalid action. Use "diag", "ping" or "listChannels".' });
    }

    if (!SHEET_ID) {
      return json(400, { error: "Missing sheetId (body.sheetId or env GOOGLE_SHEET_ID)." });
    }

    const SVC_EMAIL =
      process.env.GOOGLE_SVC_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL;

    let SVC_KEY =
      process.env.GOOGLE_SVC_PRIVATE_KEY ||
      process.env.GOOGLE_PRIVATE_KEY;

    if (!SVC_EMAIL || !SVC_KEY) {
      return json(400, {
        error: "Missing Google Service Account credentials.",
        need: ["GOOGLE_SVC_EMAIL", "GOOGLE_SVC_PRIVATE_KEY"],
        note: "Add env vars in Netlify and share the Sheet with that email (Viewer).",
      });
    }

    // Arreglar \n si viene en una sola línea
    SVC_KEY = SVC_KEY.replace(/\\n/g, "\n");

    const tokenUrl = "https://oauth2.googleapis.com/token";
    const now = Math.floor(Date.now() / 1000);

    const signed = jwt.sign(
      {
        iss: SVC_EMAIL,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: tokenUrl,
        exp: now + 3600,
        iat: now,
      },
      SVC_KEY,
      { algorithm: "RS256" }
    );

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signed,
      }),
    });

    if (!tokenRes.ok) {
      return json(400, {
        error: "Failed to obtain Google access token",
        details: await tokenRes.text(),
      });
    }
    const { access_token } = await tokenRes.json();

    const range = encodeURIComponent(`${SHEET_NAME}!A1:Z1000`);
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

    const sheetRes = await fetch(valuesUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!sheetRes.ok) {
      return json(400, { error: "Sheets API error", details: await sheetRes.text() });
    }

    const data = await sheetRes.json();
    const rows = Array.isArray(data.values) ? data.values : [];
    if (rows.length < 2) return json(200, []);

    const header = rows[0].map((h) => (h || "").toString().trim());
    const out = rows.slice(1).map((r) => {
      const obj = {};
      header.forEach((k, i) => (obj[k || `col${i + 1}`] = (r[i] || "").toString()));
      return obj;
    });

    return json(200, out);
  } catch (err) {
    return json(500, { error: "Unhandled error", details: err.message || String(err) });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { ...cors.headers }, body: JSON.stringify(obj) };
}