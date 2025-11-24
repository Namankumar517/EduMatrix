console.log("ADMIN JS LOADED");

const area = document.getElementById("area");

// ----------------------------------------------------
// MAKE ALL FUNCTIONS GLOBAL (IMPORTANT)
// ----------------------------------------------------
window.loadAddStudent = loadAddStudent;
window.loadAttendance = loadAttendance;
window.loadFees = loadFees;
window.loadHomework = loadHomework;
window.loadNotice = loadNotice;
window.loadTeacherPanel = loadTeacherPanel;
window.showTeacherManagement = showTeacherManagement;

window.addStudent = addStudent;
window.markAttendance = markAttendance;
window.saveFee = saveFee;
window.uploadHomework = uploadHomework;
window.postNotice = postNotice;
window.loadClassStudents = loadClassStudents;
window.promoteToTeacher = promoteToTeacher;
window.demoteTeacher = demoteTeacher;


// ====================================================
// 1) ADD STUDENT
// ====================================================
function loadAddStudent() {
  area.innerHTML = `
    <h3>Add Student</h3>
    <input id="s_name" placeholder="Full Name"><br><br>
    <input id="s_class" placeholder="Class eg 10th"><br><br>
    <input id="s_roll" placeholder="Roll"><br><br>
    <input id="s_phone" placeholder="Phone"><br><br>
    <button onclick="addStudent()">Add</button>
    <div id="s_msg" style="margin-top:10px"></div>
  `;
}

async function addStudent() {
  const name = s_name.value.trim();
  const cls  = s_class.value.trim();
  const roll = s_roll.value.trim();
  const phone = s_phone.value.trim();

  if (!name || !roll) return alert("Name & Roll required");

  const { error } = await supabase.from("students").insert({
    id: crypto.randomUUID(),
    name,
    class: cls,
    roll,
    phone,
    feePaid: 0
  });

  if (error) return alert(error.message);
  s_msg.innerHTML = "Student Added ✔";
}



// ====================================================
// 2) ATTENDANCE
// ====================================================
function loadAttendance() {
  area.innerHTML = `
    <h3>Attendance</h3>
    <input id="att_roll" placeholder="Roll"><br><br>
    <label><input id="att_present" type="checkbox"> Present</label><br><br>
    <button onclick="markAttendance()">Mark</button>
    <div id="att_msg" style="margin-top:10px"></div>
    <div id="att_list" style="margin-top:20px"></div>
  `;
  loadAttendanceList();
}

async function markAttendance() {
  const roll = att_roll.value.trim();
  const present = att_present.checked;
  const date = new Date().toISOString().slice(0, 10);

  if (!roll) return alert("Roll required");

  const { error } = await supabase.from("attendance").insert({
    id: crypto.randomUUID(),
    roll,
    present,
    date
  });

  if (error) return alert(error.message);
  att_msg.innerHTML = "Marked ✔";

  loadAttendanceList();
}

async function loadAttendanceList() {
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .order("date", { ascending: false })
    .limit(30);

  let html = "<table><tr><th>Date</th><th>Roll</th><th>P</th></tr>";

  (data || []).forEach(r => {
    html += `<tr><td>${r.date}</td><td>${r.roll}</td><td>${r.present ? '✔' : '✘'}</td></tr>`;
  });

  html += "</table>";
  att_list.innerHTML = html;
}



// ====================================================
// 3) FEES
// ====================================================
function loadFees() {
  area.innerHTML = `
    <h3>Fees</h3>
    <input id="f_roll" placeholder="Roll"><br><br>
    <input id="f_amount" placeholder="Amount"><br><br>
    <button onclick="saveFee()">Save Fee</button>
    <div id="f_msg" style="margin-top:10px"></div>
    <div id="fee_list" style="margin-top:20px"></div>
  `;
  loadFeesList();
}

async function saveFee() {
  const roll = f_roll.value.trim();
  const amount = parseFloat(f_amount.value);

  if (!roll || isNaN(amount)) return alert("Invalid input");

  // find student
  const { data } = await supabase.from("students").select("*").eq("roll", roll).limit(1);
  if (!data.length) return alert("Student not found");

  const stud = data[0];

  // update total feePaid
  await supabase.from("students").update({
    feePaid: (stud.feePaid || 0) + amount
  }).eq("id", stud.id);

  // add entry
  await supabase.from("fees").insert({
    id: crypto.randomUUID(),
    student_id: stud.id,
    amount,
    method: "Cash"
  });

  f_msg.innerHTML = "Fee Saved ✔";
  loadFeesList();
}

async function loadFeesList() {
  const { data } = await supabase
    .from("fees")
    .select("*")
    .order("paid_on", { ascending: false })
    .limit(20);

  let html = "<table><tr><th>Amount</th><th>Method</th><th>Date</th></tr>";

  (data || []).forEach(f => {
    html += `<tr><td>${f.amount}</td><td>${f.method}</td><td>${f.paid_on}</td></tr>`;
  });

  html += "</table>";
  fee_list.innerHTML = html;
}



// ====================================================
// 4) HOMEWORK
// ====================================================
function loadHomework() {
  area.innerHTML = `
    <h3>Upload Homework</h3>
    <input id="hw_file" type="file"><br><br>
    <button onclick="uploadHomework()">Upload</button>
    <div id="hw_msg" style="margin-top:10px"></div>
  `;
}

async function uploadHomework() {
  const file = hw_file.files[0];
  if (!file) return alert("Choose a file");

  const path = "homework/" + crypto.randomUUID() + "_" + file.name;

  const { error } = await supabase.storage.from("homework").upload(path, file);
  if (error) return alert(error.message);

  hw_msg.innerHTML = "Uploaded ✔";
}



// ====================================================
// 5) NOTICE
// ====================================================
function loadNotice() {
  area.innerHTML = `
    <h3>Post Notice</h3>
    <input id="notice_msg" placeholder="Notice text"><br><br>
    <button onclick="postNotice()">Post</button>
  `;
}

async function postNotice() {
  const msg = notice_msg.value.trim();
  if (!msg) return alert("Write something");

  await supabase.from("notices").insert({
    id: crypto.randomUUID(),
    message: msg,
    date: new Date().toISOString().slice(0, 10)
  });

  alert("Posted ✔");
}



// ====================================================
// 6) TEACHER PANEL
// ====================================================
function loadTeacherPanel() {
  area.innerHTML = `
    <h3>Teacher Panel</h3>
    <input id="t_class" placeholder="Class eg 10th"><br><br>
    <button onclick="loadClassStudents()">Load</button>
    <div id="t_list" style="margin-top:20px"></div>
  `;
}

async function loadClassStudents() {
  const cls = t_class.value.trim();
  if (!cls) return alert("Class required");

  const { data } = await supabase.from("students").select("*").eq("class", cls);

  let html = "<table><tr><th>Roll</th><th>Name</th></tr>";

  (data || []).forEach(s => {
    html += `<tr><td>${s.roll}</td><td>${s.name}</td></tr>`;
  });

  html += "</table>";

  t_list.innerHTML = html;
}



// ====================================================
// 7) TEACHER MANAGEMENT PANEL
// ====================================================
function showTeacherManagement() {
  area.innerHTML = `
    <h3>Teacher Management</h3>
    <input id="prom_email" placeholder="Teacher Email"><br><br>
    <input id="prom_name" placeholder="Teacher Name"><br><br>
    <button onclick="promoteToTeacher(prom_email.value, prom_name.value)">Promote</button>
    <button onclick="demoteTeacher(prom_email.value)" style="margin-left:10px;background:#ffdddd;">Demote</button>
  `;
}

async function promoteToTeacher(email, name) {
  if (!email) return alert("Email required");

  const { error } = await supabase.from("teachers").insert({
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name
  });

  if (error) return alert(error.message);

  alert("Teacher Added ✔");
}

async function demoteTeacher(email) {
  if (!email) return alert("Email required");

  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("email", email.toLowerCase());

  if (error) return alert(error.message);

  alert("Removed ✔");
}
