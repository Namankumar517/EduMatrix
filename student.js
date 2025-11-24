// student.js — full student panel (complete, copy-paste)
console.log("STUDENT.JS LOADED");

const studentArea = document.getElementById("studentArea");

// current user info
window.currentUser = null;
window.currentStudentRow = null; // matched row from students table (if any)

// -------------- init --------------
async function initStudent() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    // not logged in — redirect
    window.location.href = "/index.html";
    return;
  }

  // store user
  const { user } = await supabase.auth.getUser();
  window.currentUser = user?.user ?? user ?? data.session?.user ?? null;
  // try to auto-find student row
  await matchStudentRow();
  showStudent("dashboard");
}
initStudent();

// -------------- logout (global) --------------
window.logoutUser = async function() {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
};

// -------------- router --------------
window.showStudent = async function(view) {
  if (view === "dashboard") return renderDashboard();
  if (view === "attendance") return renderAttendanceView();
  if (view === "fees") return renderFeesView();
  if (view === "homework") return renderHomeworkView();
  if (view === "notices") return renderNoticesView();
};

// -------------- helper: match student row by email/phone --------------
async function matchStudentRow() {
  try {
    const email = window.currentUser?.email?.toLowerCase();
    if (!email) return null;

    // 1) try students.email
    let res = await supabase.from("students").select("*").ilike("email", email).limit(1);
    if (res.data && res.data.length) {
      window.currentStudentRow = res.data[0];
      return window.currentStudentRow;
    }

    // 2) try students.phone contains email (legacy hack, if you stored auth email in phone)
    res = await supabase.from("students").select("*").ilike("phone", `%${email}%`).limit(1);
    if (res.data && res.data.length) {
      window.currentStudentRow = res.data[0];
      return window.currentStudentRow;
    }

    // 3) try matching by exact email in custom column 'auth_email' (if used)
    res = await supabase.from("students").select("*").eq("auth_email", email).limit(1);
    if (res.data && res.data.length) {
      window.currentStudentRow = res.data[0];
      return window.currentStudentRow;
    }

    // not found — leave null (user can enter roll manually)
    window.currentStudentRow = null;
    return null;
  } catch (e) {
    console.error("matchStudentRow error", e);
    window.currentStudentRow = null;
    return null;
  }
}

// -------------- DASHBOARD --------------
async function renderDashboard() {
  studentArea.innerHTML = `<h3 class="h6">Welcome</h3><div class="note">Loading profile...</div>`;

  // show profile if matched
  if (window.currentStudentRow) {
    const s = window.currentStudentRow;
    studentArea.innerHTML = `
      <div class="h6">${escapeHtml(s.name || "Student")}</div>
      <div class="kv">Class: ${escapeHtml(s.class || "-")} • Roll: ${escapeHtml(s.roll || "-")}</div>
      <div class="note" style="margin-top:10px">Phone: ${escapeHtml(s.phone || "-")}</div>

      <div style="margin-top:14px">
        <button class="primary small" onclick="showStudent('attendance')">View Attendance</button>
        <button class="primary small" style="margin-left:8px" onclick="showStudent('fees')">View Fees</button>
      </div>
    `;
    return;
  }

  // fallback: ask roll
  studentArea.innerHTML = `
    <div class="h6">Welcome</div>
    <div class="note">We couldn't find your student record automatically. Enter your Roll/ID to view attendance and fees.</div>
    <div style="margin-top:12px" class="form-row">
      <input id="dash_roll" placeholder="Your Roll / ID">
      <button class="primary" onclick="useRollFromDashboard()">Use Roll</button>
    </div>
  `;
}

window.useRollFromDashboard = async function() {
  const r = document.getElementById("dash_roll").value.trim();
  if (!r) return alert("Enter roll");
  // try find by roll
  const { data, error } = await supabase.from("students").select("*").eq("roll", r).limit(1);
  if (error) return alert(error.message);
  if (data && data.length) {
    window.currentStudentRow = data[0];
    // optionally store auth email into students table for future auto-match
    try {
      const email = window.currentUser?.email;
      if (email) {
        await supabase.from("students").update({ email }).eq("id", data[0].id);
      }
    } catch(e){}
    showStudent("dashboard");
  } else {
    alert("No student found with that roll");
  }
};

// -------------- ATTENDANCE (student view) --------------
async function renderAttendanceView() {
  studentArea.innerHTML = `<h3 class="h6">My Attendance</h3><div id="stud_att" class="note">Loading…</div>`;

  const roll = await getRollForCurrentUser();
  if (!roll) {
    document.getElementById("stud_att").innerHTML = `Roll not found. Enter your roll below to view: <div style="margin-top:8px"><input id="att_manual_roll" placeholder="Roll"><button class="small" onclick="viewAttendanceByManualRoll()">View</button></div>`;
    return;
  }

  const { data, error } = await supabase.from("attendance").select("*").eq("roll", roll).order("date", { ascending: false }).limit(500);
  if (error) return document.getElementById("stud_att").innerText = error.message;
  if (!data || !data.length) return document.getElementById("stud_att").innerText = "No attendance records found.";

  let presentCount = 0;
  let html = '<table class="table"><tr><th>Date</th><th>Present</th></tr>';
  data.forEach(r => {
    html += `<tr><td>${r.date}</td><td>${r.present ? "Yes" : "No"}</td></tr>`;
    if (r.present) presentCount++;
  });
  html += `</table><div class="note" style="margin-top:8px">Total records: ${data.length} • Presents: ${presentCount}</div>`;

  document.getElementById("stud_att").innerHTML = html;
}

window.viewAttendanceByManualRoll = async function() {
  const r = document.getElementById("att_manual_roll").value.trim();
  if (!r) return alert("Enter roll");
  const { data, error } = await supabase.from("attendance").select("*").eq("roll", r).order("date", { ascending: false }).limit(500);
  if (error) return alert(error.message);
  if (!data.length) return alert("No records");
  let html = '<table class="table"><tr><th>Date</th><th>Present</th></tr>';
  data.forEach(r => html += `<tr><td>${r.date}</td><td>${r.present ? "Yes" : "No"}</td></tr>`);
  html += '</table>';
  document.getElementById("stud_att").innerHTML = html;
};

// helper to get roll
async function getRollForCurrentUser() {
  if (window.currentStudentRow && window.currentStudentRow.roll) return window.currentStudentRow.roll;
  // try to find student row now
  await matchStudentRow();
  if (window.currentStudentRow && window.currentStudentRow.roll) return window.currentStudentRow.roll;
  return null;
}

window.viewMyAttendance = async function() {
  // UI from earlier index.html use-case: present there as well
  const rollInput = document.getElementById("viewRoll");
  const r = rollInput ? rollInput.value.trim() : null;
  if (r) {
    const { data, error } = await supabase.from("attendance").select("*").eq("roll", r).order("date", { ascending: false }).limit(200);
    if (error) return alert(error.message);
    if (!data.length) return alert("No records for this roll");
    let html = '<table class="table"><tr><th>Date</th><th>Present</th></tr>';
    data.forEach(row => html += `<tr><td>${row.date}</td><td>${row.present ? "Yes" : "No"}</td></tr>`);
    studentArea.innerHTML = `<h3 class="h6">Attendance for ${escapeHtml(r)}</h3>` + html;
  } else {
    // show attendance page if no manual roll provided
    showStudent("attendance");
  }
};

// -------------- FEES (student view) --------------
async function renderFeesView() {
  studentArea.innerHTML = `<h3 class="h6">Fees</h3><div id="stud_fees" class="note">Loading…</div>`;

  const sid = window.currentStudentRow ? window.currentStudentRow.id : null;
  if (!sid) {
    document.getElementById("stud_fees").innerText = "Student record not found. Use dashboard to link your Roll.";
    return;
  }

  const { data, error } = await supabase.from("fees").select("*").eq("student_id", sid).order("paid_on", { ascending: false });
  if (error) return document.getElementById("stud_fees").innerText = error.message;

  let totalPaid = 0;
  (data || []).forEach(f => totalPaid += parseFloat(f.amount || 0));

  let html = `<div class="note">Total Paid: <b>${totalPaid}</b></div>`;
  if (data && data.length) {
    html += '<table class="table"><tr><th>Amount</th><th>Date</th></tr>';
    data.forEach(f => html += `<tr><td>${f.amount}</td><td>${new Date(f.paid_on).toLocaleString()}</td></tr>`);
    html += '</table>';
  } else {
    html += '<div class="note">No fee records found.</div>';
  }

  document.getElementById("stud_fees").innerHTML = html;
}

// -------------- HOMEWORK --------------
async function renderHomeworkView() {
  studentArea.innerHTML = `<h3 class="h6">Homework</h3><div id="hw_list" class="note">Loading…</div>`;
  const { data, error } = await supabase.from("homework").select("*").order("date", { ascending: false }).limit(100);
  if (error) return document.getElementById("hw_list").innerText = error.message;
  if (!data || !data.length) return document.getElementById("hw_list").innerText = "No homework";
  let html = "<ul>";
  data.forEach(h => {
    html += `<li>${escapeHtml(h.title || "File")} — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`;
  });
  html += "</ul>";
  document.getElementById("hw_list").innerHTML = html;
}

// -------------- NOTICES --------------
async function renderNoticesView() {
  studentArea.innerHTML = `<h3 class="h6">Notices</h3><div id="notice_list" class="note">Loading…</div>`;
  const { data, error } = await supabase.from("notices").select("*").order("date", { ascending: false }).limit(100);
  if (error) return document.getElementById("notice_list").innerText = error.message;
  if (!data || !data.length) return document.getElementById("notice_list").innerText = "No notices";
  let html = "<ul>";
  data.forEach(n => html += `<li>${escapeHtml(n.message)} <span class="kv">(${n.date})</span></li>`);
  html += "</ul>";
  document.getElementById("notice_list").innerHTML = html;
}

// -------------- small helpers --------------
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, function (m) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
  });
    }
