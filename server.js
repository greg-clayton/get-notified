const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL   = (process.env.SUPABASE_URL   || "").trim().replace(/\/$/, "");
const SUPABASE_KEY   = (process.env.SUPABASE_KEY   || "").trim();
const SUPABASE_TABLE = (process.env.SUPABASE_TABLE || "notifications_data").trim();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'apikey, Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Handle preflight OPTIONS requests
app.options('*', (req, res) => res.sendStatus(204));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/config", (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, supabaseTable: SUPABASE_TABLE });
});

// ── Read State ─────────────────────────────────────────────────────────────
// Persists cross-origin read IDs in Supabase row id=2 so the dashboard popup
// (file:// or localhost) and the notifications page (Render) share one truth.

async function sbFetch(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

async function loadCloudReadIds() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await sbFetch('?id=eq.2&select=data');
    const rows = await r.json();
    return rows[0]?.data?.readIds || [];
  } catch { return []; }
}

async function saveCloudReadIds(merged) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await sbFetch('', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 2, data: { readIds: merged } })
  });
}

app.get('/api/read-state', async (req, res) => {
  try {
    res.json({ readIds: await loadCloudReadIds() });
  } catch { res.json({ readIds: [] }); }
});

app.post('/api/read-state', async (req, res) => {
  const incoming = Array.isArray(req.body?.readIds) ? req.body.readIds : [];
  try {
    const existing = await loadCloudReadIds();
    const merged = [...new Set([...existing, ...incoming])];
    await saveCloudReadIds(merged);
    res.json({ ok: true });
  } catch (e) {
    console.error('read-state save failed:', e.message);
    res.status(500).json({ ok: false });
  }
});

// ── Catch-all ──────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Get Notified running on port ${PORT}`));
