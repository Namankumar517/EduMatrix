// supabase.js
// Replace the placeholders below with your Supabase project URL and anon key.
const SUPABASE_URL = "https://gqkklssatkwpgqhgqymz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2tsc3NhdGt3cGdxaGdxeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTMwMDcsImV4cCI6MjA3OTQ";

// global supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helper: safe id generator
function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'id-' + Date.now() + '-' + Math.floor(Math.random()*10000);
    }
