exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  try {
    const { sheetId, sheetName, range } = JSON.parse(event.body||"{}");
    if (!sheetId || !sheetName) {
      return { statusCode: 400, body: JSON.stringify({ error: "sheetId and sheetName required" }) };
    }

    const fetch = globalThis.fetch || (await import("node-fetch")).default;
    const apiKey = process.env.GOOGLE_API_KEY;
    let rows = [];

    if (apiKey) {
      const a1 = encodeURIComponent(`${sheetName}!A1:Z1000`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${a1}?key=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const vals = data.values || [];
      if (vals.length === 0) return { statusCode: 200, body: JSON.stringify({ ok: true, rows: [] }) };
      const headers = vals[0];
      for (let i = 1; i < vals.length; i++) {
        const obj = {};
        headers.forEach((h, idx) => obj[h||`c${idx+1}`] = vals[i][idx] ?? "");
        rows.push(obj);
      }
    } else {
      // CSV fallback (sheet must be viewable by Anyone with the link)
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const r = await fetch(csvUrl);
      if (!r.ok) throw new Error(await r.text());
      const csv = await r.text();

      // Minimal CSV parse (handles quotes)
      const parseCSV = (text) => {
        const out = []; let row = []; let cur = ""; let inQ = false;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i], nx = text[i+1];
          if (inQ) {
            if (ch === '"' && nx === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQ = false; }
            else cur += ch;
          } else {
            if (ch === '"') inQ = true;
            else if (ch === ',') { row.push(cur); cur = ""; }
            else if (ch === '\n' || ch === '\r') {
              if (cur.length || row.length) { row.push(cur); out.push(row); row = []; cur = ""; }
              if (ch === '\r' && nx === '\n') i++;
            } else { cur += ch; }
          }
        }
        if (cur.length || row.length) { row.push(cur); out.push(row); }
        return out;
      };

      const grid = parseCSV(csv);
      if (grid.length) {
        const headers = grid[0];
        for (let i = 1; i < grid.length; i++) {
          const obj = {};
          headers.forEach((h, idx) => obj[h||`c${idx+1}`] = grid[i][idx] ?? "");
          rows.push(obj);
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, rows }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
