"use strict";

const jwt = require("jsonwebtoken");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = (body.action || "").toLowerCase();

    const SHEET_ID   = body.sheetId   || process.env.GOOGLE_SHEET_ID;
    const SHEET_NAME = body.sheetName || process.env.GOOGLE_SHEET_NAME || "Videos";

    // --- diag: no filtra secretos, solo presencia ---
    if (action === "diag") {
      const email = process.env.GOOGLE_SVC_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "";
      const key   = process.env.GOOGLE_SVC_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || "";
      return json(200, {
        ok: true,
        hasSheetId: !!SHEET_ID,
        sheetIdHint: SHEET_ID ? `${SHEET_ID.slice(0,6)}...${SHEET_ID.slice(-4)}` : null,
        sheetName: SHEET_NAME,
        hasEmail: !!email,
        emailDomain: email ? email.split("@")[1] : null,
        hasKey: !!key,
        keyLen: key ? key.length : 0
      });
    }

    if (action === "ping") {
      return json(200, { ok: true, sheetId: !!SHEET_ID, sheetName: SHEET_NAME });
    }

    if (action !== "listchannels") {
      return json(400, { error: 'Invalid action. Use "diag", "ping" or "listChannels".' });
    }

    if (!SHEET_ID) return json(400, { error: "Missing sheetId." });

    const SVC_EMAIL =
      process.env.GOOGLE_SVC_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL;

    let SVC_KEY =
      process.env.GOOGLE_SVC_PRIVATE_KEY ||
      process.env.GOOGLE_PRIVATE_KEY;

    if (!SVC_EMAIL || !SVC_KEY) {
      return json(400, {
        error: "Missing Google Service Account credentials.",
        need: ["GOOGLE_SVC_EMAIL","GOOGLE_SVC_PRIVATE_KEY"],
        note: "Set env vars in Netlify and share the Sheet with that service account (Viewer)."
      });
    }

    // reparar \n escapadas
    SVC_KEY = SVC_KEY.replace(/\\n/g, "\n");

    const tokenUrl = "https://oauth2.googleapis.com/token";
    const now = Math.floor(Date.now()/1000);
    const jwtPayload = {
      iss: SVC_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: tokenUrl,
      exp: now + 3600,
      iat: now
    };

    const signed = jwt.sign(jwtPayload, SVC_KEY, { algorithm: "RS256" });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signed
      })
    });

    if (!tokenRes.ok) {
      return json(400, { error: "Failed to obtain Google access token", details: await tokenRes.text() });
    }
    const { access_token } = await tokenRes.json();

    const range = encodeURIComponent(`${SHEET_NAME}!A1:Z1000`);
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;
    const sheetRes = await fetch(valuesUrl, { headers: { Authorization: `Bearer ${access_token}` } });

    if (!sheetRes.ok) {
      return json(400, { error:"Sheets API error", details: await sheetRes.text() });
    }

    const data = await sheetRes.json();
    const rows = Array.isArray(data.values) ? data.values : [];
    if (rows.length < 2) return json(200, []); // no data

    const header = rows[0].map(h => (h||"").toString().trim());
    const out = rows.slice(1).map(r => {
      const obj = {};
      header.forEach((k,i)=> obj[k || `col${i+1}`] = (r[i]||"").toString());
      return obj;
    });

    return json(200, out);
  } catch (err) {
    return json(500, { error: "Unhandled error", details: (err && err.message) || String(err) });
  }
};

function json(statusCode, obj){
  return {
    statusCode,
    headers: { "Content-Type":"application/json", ...CORS },
    body: JSON.stringify(obj)
  };
}