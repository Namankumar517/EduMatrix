/* admin.js — full pro admin panel
   - single router
   - overview analytics
   - add student
   - attendance (mark + list)
   - fees (update + ledger)
   - homework (upload + list)
   - notices (post + list + optional push hook)
   - teacher management (promote/demote/list)
   - student search + profile
   - CSV export helpers
*/

/* ---------- basic boot ---------- */
console.log("ADMIN.JS LOADED");
const area = document.getElementById('area');

// make main functions globally callable from inline HTML
window.show = show;
window.logoutUser = logoutUser;
window.gotoHome = () => window.location.href = "/";

// expose specific actions
window.exportAllStudentsCSV = exportAllStudentsCSV;
window.exportAttendanceCSV = exportAttendanceCSV;
window.showStudentProfile = showStudentProfile;
window.showStudentSearchUI = loadStudentSearchUI;

// ---------- router ----------
function show(view) {
  // clear area quickly
  area.innerHTML = `<div class="h6">Loading ${view} …</div>`;
  switch(view) {
    case 'overview': renderOverview(); break;
    case 'addStudent': renderAddStudent(); break;
    case 'attendance': renderAttendance(); break;
    case 'fees': renderFees(); break;
    case 'homework': renderHomework(); break;
    case 'notices': renderNotice(); break;
    case 'teachers': renderTeachers(); break;
    case 'search': loadStudentSearchUI(); break;
    case 'attendanceExport': renderAttendanceExportUI(); break;
    default: renderOverview(); break;
  }
}

// auto show overview on load
document.addEventListener('DOMContentLoaded', () => show('overview'));

// ---------- auth helpers ----------
async function logoutUser() {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
}

// ---------- UTIL helpers ----------
function genId() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now(); }
function esc(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

function formatDate(ts){
  try { return new Date(ts).toLocaleString(); } catch(e){ return ts; }
}

// ---------- OVERVIEW / DASHBOARD ----------
async function renderOverview(){
  area.innerHTML = `
    <div class="h6">Overview</div>
    <div class="stat-row" id="statsRow"></div>
    <div style="margin-top:12px"><h4>Latest Notices & Homework</h4><div id="miniList"></div></div>
  `;

  // fetch metrics in parallel
  const [s1, s2, s3, s4, s5] = await Promise.all([
    supabase.from('students').select('id', { count:'exact' }).then(r => r.count||0).catch(()=>0),
    supabase.from('teachers').select('id', { count:'exact' }).then(r => r.count||0).catch(()=>0),
    supabase.from('fees').select('amount').then(r => r.data || []).catch(()=>[]),
    supabase.from('attendance').select('id', { count:'exact' }).then(r => r.count||0).catch(()=>0),
    supabase.from('homework').select('*').order('date', { ascending:false }).limit(5).then(r => r.data||[]).catch(()=>[])
  ]);

  // total fees sum
  let totalFees = 0;
  (s3||[]).forEach(f => totalFees += parseFloat(f.amount || 0));

  document.getElementById('statsRow').innerHTML = `
    <div class="stat">Students<br><div style="font-size:18px">${s1}</div></div>
    <div class="stat">Teachers<br><div style="font-size:18px">${s2}</div></div>
    <div class="stat">Fees collected<br><div style="font-size:18px">₹ ${totalFees}</div></div>
    <div class="stat">Attendance records<br><div style="font-size:18px">${s4}</div></div>
  `;

  // show latest notices & homework
  const notices = await supabase.from('notices').select('*').order('date',{ascending:false}).limit(5).then(r=>r.data||[]);
  let mini = '<div style="display:flex;gap:12px;flex-wrap:wrap">';
  mini += '<div style="flex:1"><h5>Notices</h5><ul>';
  notices.forEach(n => mini += `<li>${esc(n.message)} <span class="kv">(${n.date})</span></li>`);
  mini += '</ul></div>';

  mini += '<div style="flex:1"><h5>Homework</h5><ul>';
  (s5||[]).forEach(h => mini += `<li>${esc(h.title||'File')} <a href="${h.file_url}" target="_blank">open</a> <span class="kv">(${h.date})</span></li>`);
  mini += '</ul></div></div>';
  document.getElementById('miniList').innerHTML = mini;
}

// ---------- ADD STUDENT ----------
function renderAddStudent(){
  area.innerHTML = `
    <div class="h6">Add Student</div>
    <div class="form-row">
      <input id="s_name" placeholder="Full name">
      <input id="s_class" placeholder="Class (eg 10th)">
      <input id="s_roll" placeholder="Roll / ID">
      <input id="s_phone" placeholder="Phone">
      <input id="s_email" placeholder="Email (optional)">
      <button class="primary" onclick="addStudent()">Add Student</button>
      <div id="s_msg" class="note"></div>
    </div>
  `;
}

window.addStudent = async function(){
  const name = document.getElementById('s_name').value.trim();
  const cls = document.getElementById('s_class').value.trim();
  const roll = document.getElementById('s_roll').value.trim();
  const phone = document.getElementById('s_phone').value.trim();
  const email = document.getElementById('s_email').value.trim().toLowerCase() || null;

  if(!name || !roll) return document.getElementById('s_msg').innerText = 'Name & roll required';

  // check duplicate roll
  const { data:dup } = await supabase.from('students').select('id').eq('roll', roll).limit(1);
  if (dup && dup.length) return document.getElementById('s_msg').innerText = 'Roll already exists';

  const id = genId();
  const { error } = await supabase.from('students').insert({ id, name, class: cls, roll, phone, email, feePaid: 0 });
  if(error) return document.getElementById('s_msg').innerText = error.message;
  document.getElementById('s_msg').innerText = 'Student added ✔';
};

// ---------- ATTENDANCE ----------
function renderAttendance(){
  area.innerHTML = `
    <div class="h6">Mark Attendance</div>
    <div class="form-row">
      <input id="att_date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <input id="att_roll" placeholder="Roll / ID">
      <label><input id="att_present" type="checkbox"> Present</label>
      <button class="primary" onclick="markAttendance()">Mark</button>
    </div>
    <div style="margin-top:12px">
      <h4>Recent attendance</h4><div id="att_list"></div>
    </div>
  `;
  loadAttendanceList();
}

window.markAttendance = async function(){
  const date = document.getElementById('att_date').value;
  const roll = document.getElementById('att_roll').value.trim();
  const present = document.getElementById('att_present').checked;
  if(!date || !roll) return alert('Date & roll required');
  const { error } = await supabase.from('attendance').insert({ id: genId(), date, roll, present });
  if(error) return alert(error.message);
  alert('Marked');
  loadAttendanceList();
};

async function loadAttendanceList(){
  const { data, error } = await supabase.from('attendance').select('*').order('date',{ascending:false}).limit(50);
  if(error) return document.getElementById('att_list').innerText = error.message;
  if(!data || !data.length) return document.getElementById('att_list').innerText = 'No records';
  let html = '<table class="table"><tr><th>Date</th><th>Roll</th><th>Present</th></tr>';
  data.forEach(r => html += `<tr><td>${r.date}</td><td>${esc(r.roll)}</td><td>${r.present?'Yes':'No'}</td></tr>`);
  html += '</table>';
  document.getElementById('att_list').innerHTML = html;
}

// ---------- FEES ----------
function renderFees(){
  area.innerHTML = `
    <div class="h6">Fees</div>
    <div class="form-row">
      <input id="f_roll" placeholder="Student Roll / ID">
      <input id="f_amount" placeholder="Amount">
      <select id="f_method"><option>Cash</option><option>UPI</option><option>Card</option></select>
      <button class="primary" onclick="saveFee()">Save Fee</button>
      <div id="f_msg" class="note"></div>
    </div>
    <div style="margin-top:12px"><h4>Latest Fees</h4><div id="fee_list"></div></div>
  `;
  loadFeesList();
}

window.saveFee = async function(){
  const roll = document.getElementById('f_roll').value.trim();
  const amount = parseFloat(document.getElementById('f_amount').value);
  const method = document.getElementById('f_method').value;
  if(!roll || isNaN(amount)) return document.getElementById('f_msg').innerText = 'Invalid input';

  const { data: student } = await supabase.from('students').select('id,feePaid').eq('roll', roll).limit(1);
  if(!student || !student.length) return document.getElementById('f_msg').innerText = 'Student not found';
  const sid = student[0].id;
  const cur = parseFloat(student[0].feePaid || 0);
  const newAmt = cur + amount;

  const { error } = await supabase.from('students').update({ feePaid: newAmt }).eq('id', sid);
  if(error) return document.getElementById('f_msg').innerText = error.message;

  await supabase.from('fees').insert({ id: genId(), student_id: sid, amount, method });
  document.getElementById('f_msg').innerText = 'Fee recorded';
  loadFeesList();
};

async function loadFeesList(){
  const { data, error } = await supabase.from('fees').select('*').order('paid_on',{ascending:false}).limit(50);
  if(error) return document.getElementById('fee_list').innerText = error.message;
  if(!data || !data.length) return document.getElementById('fee_list').innerText = 'No fees yet';
  let html = '<table class="table"><tr><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr>';
  for(const f of data){
    let name = f.student_id;
    try{
      const res = await supabase.from('students').select('name').eq('id', f.student_id).limit(1);
      if(res.data && res.data.length) name = res.data[0].name;
    }catch(e){}
    html += `<tr><td>${esc(name)}</td><td>${f.amount}</td><td>${esc(f.method)}</td><td>${formatDate(f.paid_on)}</td></tr>`;
  }
  html += '</table>';
  document.getElementById('fee_list').innerHTML = html;
}

// ---------- HOMEWORK ----------
function renderHomework(){
  area.innerHTML = `
    <div class="h6">Upload Homework</div>
    <div class="form-row">
      <input id="hw_title" placeholder="Title (optional)">
      <input id="hw_file" type="file">
      <button class="primary" onclick="uploadHomework()">Upload</button>
      <div id="hw_msg" class="note"></div>
    </div>
    <div style="margin-top:12px"><h4>Homework list</h4><div id="hw_list"></div></div>
  `;
  loadHomeworkList();
}

window.uploadHomework = async function(){
  const fileInput = document.getElementById('hw_file');
  const title = document.getElementById('hw_title').value || '';
  if(!fileInput.files.length) return document.getElementById('hw_msg').innerText = 'Choose file';
  const file = fileInput.files[0];
  const path = `homework/${genId()}_${file.name}`;

  const { error } = await supabase.storage.from('homework').upload(path, file, { upsert: true });
  if(error) return document.getElementById('hw_msg').innerText = error.message;

  const { data: urlData } = supabase.storage.from('homework').getPublicUrl(path);
  const publicUrl = urlData ? urlData.publicUrl : null;

  await supabase.from('homework').insert({ id: genId(), title, file_url: publicUrl, date: new Date().toISOString().slice(0,10) });
  document.getElementById('hw_msg').innerText = 'Uploaded';
  loadHomeworkList();
};

async function loadHomeworkList(){
  const { data, error } = await supabase.from('homework').select('*').order('date',{ascending:false}).limit(50);
  if(error) return document.getElementById('hw_list').innerText = error.message;
  if(!data || !data.length) return document.getElementById('hw_list').innerText = 'No homework';
  let html = '<ul>';
  data.forEach(h => html += `<li>${esc(h.title || 'File')} — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`);
  html += '</ul>';
  document.getElementById('hw_list').innerHTML = html;
}

// ---------- NOTICES ----------
function renderNotice(){
  area.innerHTML = `
    <div class="h6">Post Notice</div>
    <div class="form-row">
      <input id="notice_msg" placeholder="Notice text">
      <button class="primary" onclick="postNotice()">Post & Notify</button>
      <div id="notice_info" class="note"></div>
    </div>
    <div style="margin-top:12px"><h4>Latest notices</h4><div id="notice_list"></div></div>
  `;
  loadNotices();
}

window.postNotice = async function(){
  const msg = document.getElementById('notice_msg').value.trim();
  if(!msg) return document.getElementById('notice_info').innerText = 'Enter notice';
  const { error } = await supabase.from('notices').insert({ id: genId(), message: msg, date: new Date().toISOString().slice(0,10) });
  if(error) return document.getElementById('notice_info').innerText = error.message;
  document.getElementById('notice_info').innerText = 'Posted';
  loadNotices();

  // Optional: call push-notice edge function (if configured)
  try {
    fetch('/.netlify/functions/send-notice', { // replace with your edge function URL if using Supabase/Vercel
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title:'New Notice', message: msg })
    }).catch(()=>{ /* ignore */ });
  } catch(e){}
};

async function loadNotices(){
  const { data, error } = await supabase.from('notices').select('*').order('date',{ascending:false}).limit(50);
  if(error) return document.getElementById('notice_list').innerText = error.message;
  if(!data || !data.length) return document.getElementById('notice_list').innerText = 'No notices';
  let html = '<ul>';
  data.forEach(n => html += `<li>${esc(n.message)} <span class="kv">(${n.date})</span></li>`);
  html += '</ul>';
  document.getElementById('notice_list').innerHTML = html;
}

// ---------- TEACHERS (manage) ----------
function renderTeachers(){
  area.innerHTML = `<div class="h6">Teachers</div><div style="margin-top:8px"><button class="primary" onclick="loadTeachersList()">Refresh</button></div><div id="teacher_list" style="margin-top:12px"></div>`;
  loadTeachersList();
}

async function loadTeachersList(){
  const { data, error } = await supabase.from('teachers').select('*').order('name',{ascending:true});
  if(error) return document.getElementById('teacher_list').innerText = error.message;
  if(!data || !data.length) return document.getElementById('teacher_list').innerText = 'No teachers';
  let html = '<ul>';
  data.forEach(t => html += `<li style="padding:8px;border-bottom:1px solid #eef4ff">${esc(t.name)} — ${esc(t.email)} <button class="small" style="margin-left:8px" onclick="demoteTeacher('${esc(t.email)}')">Remove</button></li>`);
  html += '</ul>';
  document.getElementById('teacher_list').innerHTML = html;
}

window.promoteToTeacher = async function(email, name='Teacher'){
  if(!email) return alert('Email required');
  const { error } = await supabase.from('teachers').insert({ id: genId(), name, email: email.toLowerCase(), role: 'teacher' });
  if(error) return alert(error.message);
  alert('Promoted');
  loadTeachersList();
};

window.demoteTeacher = async function(email){
  if(!email) return alert('Email required');
  const { error } = await supabase.from('teachers').delete().eq('email', email.toLowerCase());
  if(error) return alert(error.message);
  alert('Removed');
  loadTeachersList();
};

// ---------- SEARCH + PROFILE ----------
function loadStudentSearchUI(){
  area.innerHTML = `
    <div class="h6">Student Search</div>
    <div class="form-row">
      <input id="search_q" placeholder="Name or Roll">
      <button class="primary" onclick="doStudentSearch()">Search</button>
    </div>
    <div id="search_res" style="margin-top:12px"></div>
  `;
}

window.doStudentSearch = async function(){
  const q = document.getElementById('search_q').value.trim();
  if(!q) return alert('Enter search');
  const { data, error } = await supabase.from('students')
    .select('*')
    .or(`name.ilike.%${q}%,roll.ilike.%${q}%`)
    .limit(100);
  if(error) return alert(error.message);
  if(!data || !data.length) return document.getElementById('search_res').innerText = 'No results';
  let html = '<ul>';
  data.forEach(s => {
    html += `<li style="padding:8px;border-bottom:1px solid #f1f4ff">
      <b>${esc(s.roll)} — ${esc(s.name)}</b><br>
      <small class="kv">${esc(s.class||'')} • ${esc(s.phone||'')}</small><br>
      <button class="small" onclick="showStudentProfile('${s.id}')">Open Profile</button>
    </li>`;
  });
  html += '</ul>';
  document.getElementById('search_res').innerHTML = html;
};

async function showStudentProfile(id){
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if(error) return alert(error.message);
  const att = await supabase.from('attendance').select('*').eq('roll', data.roll).order('date',{ascending:false}).limit(50).then(r=>r.data||[]);
  const fees = await supabase.from('fees').select('*').eq('student_id', id).order('paid_on',{ascending:false}).limit(50).then(r=>r.data||[]);

  let html = `<h3>${esc(data.name)} — ${esc(data.roll)}</h3><div class="kv">Class: ${esc(data.class||'')} • Phone: ${esc(data.phone||'')}</div><hr>`;
  html += `<div style="margin-top:8px"><b>Attendance (recent)</b>`;
  if(att.length){ html += '<ul>'; att.forEach(a=> html += `<li>${a.date} — ${a.present ? 'P' : 'A'}</li>`); html += '</ul>'; } else html += '<div class="note">No attendance</div>';
  html += `</div><div style="margin-top:8px"><b>Fees</b>`;
  if(fees.length){ html += '<table class="table"><tr><th>Amt</th><th>Date</th></tr>'; fees.forEach(f=> html += `<tr><td>${f.amount}</td><td>${formatDate(f.paid_on)}</td></tr>`); html += '</table>'; } else html += '<div class="note">No fees</div>';
  html += `</div>`;
  document.getElementById('search_res').innerHTML = html;
}

// ---------- ATTENDANCE EXPORT UI ----------
function renderAttendanceExportUI(){
  area.innerHTML = `
    <div class="h6">Export Attendance</div>
    <div class="form-row">
      <input id="exp_from" type="date" value="${new Date().toISOString().slice(0,10)}">
      <input id="exp_to" type="date" value="${new Date().toISOString().slice(0,10)}">
      <button class="primary" onclick="exportAttendanceCSV(null, document.getElementById('exp_from').value, document.getElementById('exp_to').value)">Export CSV</button>
    </div>
    <div id="exp_msg" style="margin-top:10px"></div>
  `;
}

// export helper
async function exportAttendanceCSV(cls, fromDate, toDate){
  if(!fromDate || !toDate) return alert('Select dates');
  const { data, error } = await supabase.from('attendance').select('*').gte('date', fromDate).lte('date', toDate).order('date',{ascending:true});
  if(error) return alert(error.message);

  const rolls = [...new Set((data||[]).map(r=>r.roll))];
  const { data: studs } = await supabase.from('students').select('roll,name').in('roll', rolls);
  const nameMap = {}; (studs||[]).forEach(s=> nameMap[s.roll] = s.name);

  let csv = 'roll,name,date,present\n';
  (data||[]).forEach(r => csv += `${r.roll},"${(nameMap[r.roll]||'')}",${r.date},${r.present}\n`);

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `attendance_${fromDate}_${toDate}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ---------- EXPORT STUDENTS CSV ----------
async function exportAllStudentsCSV(){
  const { data, error } = await supabase.from('students').select('*');
  if(error) return alert(error.message);
  let csv = 'id,roll,name,class,phone,email\n';
  (data||[]).forEach(s => csv += `${s.id},${esc(s.roll)},${esc(s.name)},${esc(s.class)},${esc(s.phone)},${esc(s.email||'')}\n`);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `students_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ---------- utility: ensure functions are available globally (for inline onclick) ----------
window.renderOverview = renderOverview;
window.renderAddStudent = renderAddStudent;
window.renderAttendance = renderAttendance;
window.renderFees = renderFees;
window.renderHomework = renderHomework;
window.renderNotice = renderNotice;
window.renderTeachers = renderTeachers;
window.loadStudentSearchUI = loadStudentSearchUI;
window.renderAttendanceExportUI = renderAttendanceExportUI;

// end of admin.js
