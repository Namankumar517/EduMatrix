console.log("APP LOADED");

// Make loginUser global
window.loginUser = async function () {
  alert("Login clicked"); // debug

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Check supabase client
  if (!supabase) {
    alert("Supabase NOT loaded");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById("msg").innerText = error.message;
    return;
  }

  if (email.includes("admin")) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
};
