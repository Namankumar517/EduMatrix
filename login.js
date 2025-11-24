console.log("LOGIN.JS LOADED");

async function loginUser() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!email || !pass) {
    alert("Enter email & password");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: pass
  });

  if (error) {
    alert("Login failed: " + error.message);
    return;
  }

  // role check
  if (email.includes("admin")) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
}
