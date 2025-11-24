console.log("APP.JS LOADED");

// ----------------------
//  AUTH CHECK
// ----------------------
async function checkLogin() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    window.location.href = "index.html";
  }
}
if (!location.pathname.includes("index.html")) {
  checkLogin();
}
}

// ----------------------
// LOGOUT
// ----------------------
async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Failed to logout: " + error.message);
    return;
  }
  window.location.href = "index.html";
}

// ----------------------
// LOAD MAIN CONTENT BOX
// ----------------------
function setView(html) {
  document.getElementById("main").innerHTML = html;
}

// ----------------------
// ADD STUDENT PAGE
// ----------------------
function loadAddStudent() {
  setView(`
    <h3>Add Student</h3>
    <input id="s_name" placeholder="Full Name" class="input"><br><br>
    <input id="s_class" placeholder="Class" class="input"><br><br>
    <input id="s_roll" placeholder="Roll Number" class="input"><br><br>
    <input id="s_phone" placeholder="Phone Number" class="input"><br><br>

    <button onclick="saveStudent()" class="primary">Add Student</button>
    <div id="msg"></div>
  `);
}

async function saveStudent() {
  let name = document.getElementById("s_name").value.trim();
  let cls = document.getElementById("s_class").value.trim();
  let roll = document.getElementById("s_roll").value.trim();
  let phone = document.getElementById("s_phone").value.trim();

  if (!name || !roll) return alert("Name & Roll are required!");

  const { data, error } = await supabase
    .from("students")
    .insert({
      id: crypto.randomUUID(),
      name: name,
      class: cls,
      roll: roll,
      phone: phone,
      feePaid: 0
    });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Student added successfully!");
    loadAddStudent();
  }
}

// ----------------------
// ATTENDANCE PAGE
// ----------------------
function loadAttendance() {
  setView(`
    <h3>Mark Attendance</h3>
    <button class="primary" onclick="showAttendanceList()">Load Students</button>
    <div id="att_list"></div>
  `);
}

async function showAttendanceList() {
  const { data, error } = await supabase.from("students").select("*").order("roll");

  if (error) return alert(error.message);

  let html = `<h4>Select students (present)</h4>`;
  html += `<div style='padding:10px;'>`;

  data.forEach(s => {
    html += `
      <div class="row">
        <input type="checkbox" class="att_chk" value="${s.roll}">
        ${s.roll} — ${s.name}
      </div>`;
  });

  html += `
    <br>
    <button class="primary" onclick="saveAttendance()">Save Attendance</button>
  </div>
  `;

  document.getElementById("att_list").innerHTML = html;
}

async function saveAttendance() {
  let checks = document.querySelectorAll(".att_chk");
  let today = new Date().toISOString().split("T")[0];

  for (let c of checks) {
    await supabase.from("attendance").insert({
      id: crypto.randomUUID(),
      date: today,
      roll: c.value,
      present: c.checked
    });
  }

  alert("Attendance saved!");
  loadAttendance();
}

// ----------------------
// FEES PAGE
// ----------------------
function loadFees() {
  setView(`
    <h3>Update Fees</h3>
    <input id="fee_roll" placeholder="Roll Number" class="input"><br><br>
    <input id="fee_amt" placeholder="Add Amount" class="input"><br><br>
    <button class="primary" onclick="updateFees()">Update</button>
  `);
}

async function updateFees() {
  let roll = document.getElementById("fee_roll").value.trim();
  let amt = parseFloat(document.getElementById("fee_amt").value);

  if (!roll || isNaN(amt)) return alert("Enter valid details");

  // fetch student id
  const { data: s, error: e1 } = await supabase
    .from("students")
    .select("*")
    .eq("roll", roll)
    .single();

  if (e1) return alert("Student not found");

  // update ledger
  await supabase.from("fees").insert({
    id: crypto.randomUUID(),
    student_id: s.id,
    amount: amt,
    method: "cash"
  });

  // update total feePaid inside student table
  await supabase.rpc("increase_fee_paid", { sid: s.id, add_amount: amt });

  alert("Fee Updated!");
}

// ----------------------
// TEACHER PANEL (bulk attendance)
// ----------------------
function loadTeacherPanel() {
  setView(`
    <h3>Teacher Panel</h3>
    <button class="primary" onclick="showTeacherList()">Load Students</button>
    <div id="teacher_list"></div>
  `);
}

async function showTeacherList() {
  const { data } = await supabase.from("students").select("*").order("roll");

  let html = `<h4>Bulk Select Students</h4>`;

  data.forEach(s => {
    html += `
      <div class="row">
        <input type="checkbox" class="tp" value="${s.roll}">
        ${s.roll} — ${s.name}
      </div>
    `;
  });

  html += `
    <br>
    <button class="primary" onclick="teacherSave()">Save</button>
  `;

  document.getElementById("teacher_list").innerHTML = html;
}

async function teacherSave() {
  let list = document.querySelectorAll(".tp");
  let today = new Date().toISOString().split("T")[0];

  for (let x of list) {
    await supabase.from("attendance").insert({
      id: crypto.randomUUID(),
      date: today,
      roll: x.value,
      present: x.checked
    });
  }

  alert("Saved!");
}

// ----------------------
// HOMEWORK UPLOAD
// ----------------------
function loadHomework() {
  setView(`
    <h3>Upload Homework</h3>
    <input type="file" id="hwfile"><br><br>
    <button class="primary" onclick="uploadHomework()">Upload</button>
  `);
}

async function uploadHomework() {
  let file = document.getElementById("hwfile").files[0];
  if (!file) return alert("Choose a file");

  let filename = Date.now() + "_" + file.name;

  let { error: e1 } = await supabase.storage
    .from("homework")
    .upload(filename, file);

  if (e1) return alert("Upload failed: " + e1.message);

  let { data } = supabase.storage.from("homework").getPublicUrl(filename);

  await supabase.from("homework").insert({
    id: crypto.randomUUID(),
    title: "HW",
    file_url: data.publicUrl
  });

  alert("Homework Uploaded!");
}

// ----------------------
// NOTICE PAGE
// ----------------------
function loadNotice() {
  setView(`
    <h3>Post Notice</h3>
    <textarea id="notice_msg" class="input" style="height:80px;" placeholder="Write notice..."></textarea><br><br>
    <button class="primary" onclick="postNotice()">Post</button>
  `);
}

async function postNotice() {
  let msg = document.getElementById("notice_msg").value.trim();
  if (!msg) return alert("Enter notice");

  await supabase.from("notices").insert({
    id: crypto.randomUUID(),
    message: msg,
    posted_by: "admin"
  });

  alert("Notice posted!");
    }
