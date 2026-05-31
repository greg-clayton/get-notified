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

async function loadCloudState() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { readIds: [], pinnedIds: [] };
  try {
    const r = await sbFetch('?id=eq.2&select=data');
    const rows = await r.json();
    const data = rows[0]?.data || {};
    return { readIds: data.readIds || [], pinnedIds: data.pinnedIds || [] };
  } catch { return { readIds: [], pinnedIds: [] }; }
}

async function saveCloudState({ readIds, pinnedIds }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await sbFetch('', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 2, data: { readIds, pinnedIds } })
  });
}

app.get('/api/read-state', async (req, res) => {
  try {
    res.json(await loadCloudState());
  } catch { res.json({ readIds: [], pinnedIds: [] }); }
});

app.post('/api/read-state', async (req, res) => {
  const body = req.body || {};
  const incomingReadIds   = Array.isArray(body.readIds)   ? body.readIds   : null;
  const incomingPinnedIds = Array.isArray(body.pinnedIds) ? body.pinnedIds : null;
  try {
    const existing = await loadCloudState();
    // readIds: union merge (reads only accumulate)
    const mergedReadIds = incomingReadIds !== null
      ? [...new Set([...existing.readIds, ...incomingReadIds])]
      : existing.readIds;
    // pinnedIds: replacement (latest write wins); omitting field = no change
    const newPinnedIds = incomingPinnedIds !== null ? incomingPinnedIds : existing.pinnedIds;
    await saveCloudState({ readIds: mergedReadIds, pinnedIds: newPinnedIds });
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
