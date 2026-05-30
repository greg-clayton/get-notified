const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL   = (process.env.SUPABASE_URL   || "").trim().replace(/\/$/, "");
const SUPABASE_KEY   = (process.env.SUPABASE_KEY   || "").trim();
const SUPABASE_TABLE = (process.env.SUPABASE_TABLE || "notifications_data").trim();

let memoryStore = null;

async function supabaseRequest(method, body = null) {
  const isGet = method === "GET";
  const url   = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.1${isGet ? "&select=data" : ""}`;
  const res   = await fetch(url, {
    method:  isGet ? "GET" : "PATCH",
    headers: {
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=minimal",
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (isGet) {
    const json = await res.json();
    return json[0]?.data || [];
  }
}

async function readNotifications() {
  if (SUPABASE_URL && SUPABASE_KEY) return await supabaseRequest("GET");
  return memoryStore || [];
}

async function writeNotifications(data) {
  if (SUPABASE_URL && SUPABASE_KEY) {
    await supabaseRequest("PATCH", { data });
  } else {
    memoryStore = data;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/debug", (req, res) => {
  res.json({
    nodeVersion:   process.version,
    fetchAvailable: typeof fetch !== "undefined",
    supabaseUrlSet: !!SUPABASE_URL,
    supabaseUrlPreview: SUPABASE_URL ? SUPABASE_URL.slice(0, 40) : "NOT SET",
    supabaseKeySet: !!SUPABASE_KEY,
    supabaseTable:  SUPABASE_TABLE,
  });
});

app.get("/api/notifications", async (req, res) => {
  try   { res.json(await readNotifications()); }
  catch (e) { console.error(e); res.status(500).json({ error: "Failed to read notifications" }); }
});

app.post("/api/notifications", async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: "Expected array" });
  try   { await writeNotifications(data); res.json(data); }
  catch (e) { console.error(e); res.status(500).json({ error: "Failed to save notifications" }); }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Get Notified running on port ${PORT}`));
