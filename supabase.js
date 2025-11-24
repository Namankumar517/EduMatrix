// supabase.js
// Replace the placeholders below with your Supabase project URL and anon key.
const SUPABASE_URL = "https://.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";

// global supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helper: safe id generator
function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'id-' + Date.now() + '-' + Math.floor(Math.random()*10000);
    }
