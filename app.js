// app.js — Login logic and small helpers
console.log("APP JS LOADED");

window.loginUser = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    document.getElementById("msg").innerText = "Enter email and password";
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("msg").innerText = error.message;
    return;
  }

  // role detection: admin if email contains 'admin', teacher if in teachers table, else student
  const lower = email.toLowerCase();
  // check teachers
  const { data: tdata } = await supabase.from('teachers').select('id').eq('email', lower).limit(1);
  if (tdata && tdata.length) {
    window.location.href = "teacher.html"; // if you create teacher.html later
    return;
  }

  if (lower.includes('admin')) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
};
