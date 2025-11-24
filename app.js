// app.js
// relies on supabase.js (global supabase)
console.log("APP LOADED");
async function loginUser(){
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;

  if(!email || !pass){
    document.getElementById("msg").innerText = "Enter email and password";
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if(error){
    document.getElementById("msg").innerText = error.message;
    return;
  }

  // determine role: teacher/admin/student via simple lookup tables
  const userEmail = email.toLowerCase();
  // check teachers table first
  const { data: tdata } = await supabase.from('teachers').select('id').eq('email', userEmail).limit(1);
  if(tdata && tdata.length) {
    window.location.href = "teacher.html";
    return;
  }
  // check admin by convention: email containing 'admin' OR created in a simple admins table
  if(userEmail.includes('admin')) {
    window.location.href = "admin.html";
    return;
  }

  // default student
  window.location.href = "student.html";
}
