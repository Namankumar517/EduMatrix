// teacher.js — full teacher features
console.log("TEACHER JS LOADED");

const tarea = document.getElementById('tarea');

function showTeacher(section) {
  if (section === 'class') renderClassStudents();
  else if (section === 'attendance') renderMarkAttendance();
  else if (section === 'homework') renderHomeworkUpload();
  else if (section === 'notice') renderTeacherNotice();
}

// ----------------- Class list -----------------
function renderClassStudents() {
  tarea.innerHTML = `
    <div class="h6">Class Students</div>
    <div class="form-row">
      <input id="t_class_input" placeholder="Enter class (eg 10th)">
      <button class="primary" onclick="loadClassStudents()">Load</button>
    </div>
    <div id="class_list" style="margin-top:12px"></div>
  `;
}

async function loadClassStudents(){
  const cls = document.getElementById('t_class_input').value.trim();
  if(!cls) return alert('Enter class');

  const { data, error } = await supabase.from('students').select('*').eq('class', cls).order('roll');
  const el = document.getElementById('class_list');
  if(error) return el.innerText = error.message;
  if(!data.length) return el.innerText = 'No students';

  let html = '<table class="table"><tr><th>Roll</th><th>Name</th><th>Phone</th></tr>';
  data.forEach(s => html += `<tr><td>${s.roll}</td><td>${s.name}</td><td>${s.phone || '-'}</td></tr>`);
  html += '</table>';
  el.innerHTML = html;
}

// ----------------- Mark Attendance -----------------
function renderMarkAttendance(){
  tarea.innerHTML = `
    <div class="h6">Mark Attendance</div>
    <div class="form-row">
      <input id="att_class" placeholder="Class (eg 10th)">
      <input id="att_date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <button class="primary" onclick="loadAttendanceForClass()">Load Students</button>
    </div>
    <div id="att_box" style="margin-top:12px"></div>
  `;
}

async function loadAttendanceForClass(){
  const cls = document.getElementById('att_class').value.trim();
  const date = document.getElementById('att_date').value;
  if(!cls || !date) return alert('Enter class and date');

  const { data, error } = await supabase.from('students').select('*').eq('class', cls).order('roll');
  const box = document.getElementById('att_box');
  if(error) return box.innerText = error.message;
  if(!data.length) return box.innerText = 'No students';

  let html = '<div>';
  data.forEach(s => {
    html += `<div class="row" style="align-items:center;margin-bottom:8px">
      <label style="width:70%">${s.roll} — ${s.name}</label>
      <div style="width:30%"><select id="sel_${s.roll}"><option value="true">Present</option><option value="false">Absent</option></select></div>
    </div>`;
  });
  html += `<div style="margin-top:10px"><button class="primary" onclick="saveClassAttendance('${cls}','${date}')">Save Attendance</button>
    <button style="margin-left:8px" class="small" onclick="downloadAttendanceCSV('${cls}','${date}')">Export CSV</button></div></div>`;
  box.innerHTML = html;
}

async function saveClassAttendance(cls, date){
  const selects = document.querySelectorAll('[id^=sel_]');
  const inserts = [];
  for(let sel of selects){
    const roll = sel.id.replace('sel_','');
    const present = sel.value === 'true';
    inserts.push({
      id: crypto.randomUUID(),
      date,
      roll,
      present
    });
  }
  // insert in batch
  const { error } = await supabase.from('attendance').insert(inserts);
  if(error) return alert(error.message);
  alert('Attendance saved');
}

// ----------------- Export CSV -----------------
async function downloadAttendanceCSV(cls, date){
  // fetch attendance for class & date
  const { data, error } = await supabase.from('attendance').select('*').eq('date', date).order('roll');
  if(error) return alert(error.message);
  if(!data || !data.length) return alert('No attendance found for this date');

  // join with student names
  const rolls = [...new Set(data.map(r => r.roll))];
  const { data: students } = await supabase.from('students').select('roll,name').in('roll', rolls);
  const nameMap = {};
  (students||[]).forEach(s=> nameMap[s.roll]=s.name);

  let csv = 'roll,name,present,date\n';
  data.forEach(r => {
    csv += `${r.roll},"${(nameMap[r.roll]||'')}",${r.present},${r.date}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${cls}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------- Homework (teacher upload) -----------------
function renderHomeworkUpload(){
  tarea.innerHTML = `
    <div class="h6">Upload Homework</div>
    <div class="form-row">
      <input id="hw_title" placeholder="Title">
      <input id="hw_file" type="file">
      <button class="primary" onclick="teacherUploadHomework()">Upload</button>
    </div>
    <div id="hw_status" class="note"></div>
  `;
}

async function teacherUploadHomework(){
  const fileInput = document.getElementById('hw_file');
  const title = document.getElementById('hw_title').value || '';
  if(!fileInput.files.length) return alert('Choose file');
  const file = fileInput.files[0];
  const path = `homework/${crypto.randomUUID()}_${file.name}`;

  const { error: upErr } = await supabase.storage.from('homework').upload(path, file, { upsert: true });
  if(upErr) return alert(upErr.message);

  const { data: urlData } = supabase.storage.from('homework').getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || null;

  await supabase.from('homework').insert({
    id: crypto.randomUUID(),
    title,
    file_url: publicUrl,
    uploaded_by: (await supabase.auth.getUser()).data?.user?.email || 'teacher',
    date: new Date().toISOString().slice(0,10)
  });

  document.getElementById('hw_status').innerText = 'Uploaded';
  document.getElementById('hw_file').value = '';
}

// ----------------- Notices (teacher) -----------------
function renderTeacherNotice(){
  tarea.innerHTML = `
    <div class="h6">Post Notice</div>
    <div class="form-row">
      <textarea id="t_notice" placeholder="Write notice"></textarea>
      <button class="primary" onclick="postTeacherNotice()">Post</button>
    </div>
    <div id="t_notice_status" class="note"></div>
  `;
}

async function postTeacherNotice(){
  const msg = document.getElementById('t_notice').value.trim();
  if(!msg) return alert('Enter notice');
  const user = (await supabase.auth.getUser()).data?.user?.email || 'teacher';
  const { error } = await supabase.from('notices').insert({
    id: crypto.randomUUID(),
    message: msg,
    posted_by: user,
    date: new Date().toISOString().slice(0,10)
  });
  if(error) return alert(error.message);
  document.getElementById('t_notice_status').innerText = 'Posted';
  document.getElementById('t_notice').value = '';
}

// ----------------- boot: show default -----------------
showTeacher('class');
