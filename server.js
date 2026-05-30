const express = require("express");
const path    = require("path");
const https   = require("https");

const app  = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL   = (process.env.SUPABASE_URL   || "").trim().replace(/\/$/, "");
const SUPABASE_KEY   = (process.env.SUPABASE_KEY   || "").trim();
const SUPABASE_TABLE = (process.env.SUPABASE_TABLE || "notifications_data").trim();

let memoryStore = null;

function supabaseRequest(method, body = null) {
  return new Promise((resolve, reject) => {
    const host    = new URL(SUPABASE_URL).hostname;
    const isGet   = method === "GET";
    const options = {
      hostname: host,
      path:     `/rest/v1/${SUPABASE_TABLE}?id=eq.1${isGet ? "&select=data" : ""}`,
      method:   isGet ? "GET" : "PATCH",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        if (isGet) {
          try   { resolve(JSON.parse(raw)[0]?.data || []); }
          catch { reject(new Error("Invalid JSON from Supabase")); }
        } else { resolve(); }
      });
    });
    req.on("error", reject);
    if (body !== null) req.write(JSON.stringify(body));
    req.end();
  });
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
