const express = require("express");
const path    = require("path");
const fs      = require("fs");

const app  = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL   = (process.env.SUPABASE_URL   || "").trim().replace(/\/$/, "");
const SUPABASE_KEY   = (process.env.SUPABASE_KEY   || "").trim();
const SUPABASE_TABLE = (process.env.SUPABASE_TABLE || "notifications_data").trim();

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("*", (req, res) => {
  const html     = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  const config   = `<script>window.__SB_URL__=${JSON.stringify(SUPABASE_URL)};window.__SB_KEY__=${JSON.stringify(SUPABASE_KEY)};window.__SB_TABLE__=${JSON.stringify(SUPABASE_TABLE)};</script>`;
  res.send(html.replace("<head>", "<head>" + config));
});

app.listen(PORT, () => console.log(`Get Notified running on port ${PORT}`));
