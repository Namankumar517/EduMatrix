// login.js
console.log("LOGIN.JS LOADED");

async function loginUser() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Enter credentials");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("Login failed: " + error.message);

  // check teachers table for role
  const { data: teachers } = await supabase.from("teachers").select("role").eq("email", email.toLowerCase()).limit(1);

  const role = (teachers && teachers[0] && teachers[0].role) ? teachers[0].role : 'student';
  if (role === 'admin') window.location.href = "/admin.html";
  else if (role === 'teacher') window.location.href = "/teacher.html";
  else window.location.href = "/student.html";
}
