console.log("SUPABASE LOADED");

// Correct Supabase URL
const SUPABASE_URL = "https://gqkklssatkwpgqhgqymz.supabase.co";

// FULL ANON KEY (Your correct key)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2tsc3NhdGt3cGdxaGdxeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTMwMDcsImV4cCI6MjA3OTQ4OTAwN30.M0BnJSwNDAU90wIqSxi_gBU0tyutvLNxBTHkM-YyVpc";

// DO NOT overwrite "supabase"
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make global
window.supabase = sb;

// ID generator
function genId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}
