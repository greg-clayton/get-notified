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
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, supabaseTable: SUPABASE_TABLE });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Get Notified running on port ${PORT}`));
