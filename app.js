// Supabase Connection
const supabaseClient = supabase.createClient(
  "https://gqkklssatkwpgqhgqymz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2tsc3NhdGt3cGdxaGdxeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTMwMDcsImV4cCI6MjA3OTQ4OTAwN30.M0BnJSwNDAU90wIqSxi_gBU0tyutvLNxBTHkM-YyVpc"
);

// Login Function
window.loginUser = async function() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: pass
  });

  if(error){
    document.getElementById("msg").innerText = error.message;
    return;
  }

  if(email.includes("admin")) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
};