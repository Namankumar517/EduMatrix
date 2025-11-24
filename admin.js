// admin.js — full admin UI & functions
console.log("ADMIN JS LOADED");

const area = document.getElementById('area');

function show(type){
  if(type === 'addStudent') renderAddStudent();
  else if(type === 'attendance') renderAttendance();
  else if(type === 'fees') renderFees();
  else if(type === 'homework') renderHomework();
  else if(type === 'notice') renderNotice();
  else if(type === 'teacher') renderTeacherPanel();
}

// --- Admin extra utilities ---

// Promote a user to teacher table (create teacher)
async function promoteToTeacher(email, name = 'Teacher') {
  if(!email) return alert('Email required');
  const { error } = await supabase.from('teachers').insert({
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase()
  });
  if(error) return alert('Promote error: ' + error.message);
  alert('Promoted to teacher');
}

// Demote (remove) teacher by email
async function demoteTeacher(email) {
  if(!email) return alert('Email required');
  const { error } = await supabase.from('teachers').delete().eq('email', email.toLowerCase());
  if(error) return alert('Demote error: ' + error.message);
  alert('Teacher removed');
}

// Student search (partial)
async function adminSearchStudent(q) {
  if(!q) return alert('Enter search text');
  const { data, error } = await supabase.from('students').select('*')
    .or(`name.ilike.%${q}%,roll.ilike.%${q}%`).limit(50);
  if(error) return alert(error.message);
  // simple display
  let html = '<table class="table"><tr><th>Roll</th><th>Name</th><th>Class</th></tr>';
  data.forEach(s => html += `<tr><td>${s.roll}</td><td>${s.name}</td><td>${s.class}</td></tr>`);
  html += '</table>';
  document.getElementById('area').innerHTML = html;
}

// Export attendance (admin)
async function adminExportAttendance(cls, fromDate, toDate) {
  const { data, error } = await supabase.from('attendance').select('*')
    .gte('date', fromDate).lte('date', toDate).order('date', { ascending: true });
  if(error) return alert(error.message);
  // map names
  const rolls = [...new Set(data.map(r => r.roll))];
  const { data: studs } = await supabase.from('students').select('roll,name').in('roll', rolls);
  const nameMap = {}; (studs||[]).forEach(s => nameMap[s.roll]=s.name);
  let csv = 'roll,name,date,present\n';
  data.forEach(r => csv += `${r.roll},"${(nameMap[r.roll]||'')}",${r.date},${r.present}\n`);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `attendance_${fromDate}_${toDate}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function renderAddStudent(){
  area.innerHTML = `
    <div class="h6">Add Student</div>
    <div class="form-row">
      <input id="s_name" placeholder="Full name" type="text">
      <div class="row inline">
        <input id="s_class" placeholder="Class (eg 10th)" type="text">
        <input id="s_roll" placeholder="Roll / ID" type="text">
      </div>
      <input id="s_phone" placeholder="Phone" type="text">
      <input id="s_fee" placeholder="Fee paid (optional)" type="text">
      <button class="primary" onclick="addStudent()">Add</button>
      <div id="s_msg" class="note"></div>
    </div>
  `;
}

async function addStudent(){
  const name = document.getElementById('s_name').value.trim();
  const cls = document.getElementById('s_class').value.trim();
  const roll = document.getElementById('s_roll').value.trim();
  const phone = document.getElementById('s_phone').value.trim();
  const fee = document.getElementById('s_fee').value || 0;

  if(!name || !roll){ document.getElementById('s_msg').innerText='Name & roll required'; return; }

  const id = genId();
  const { error } = await supabase.from('students').insert({ id, name, class: cls, roll, phone, feePaid: fee });
  if(error){ document.getElementById('s_msg').innerText = error.message; return; }
  document.getElementById('s_msg').innerText = 'Student added';
  // clear
  document.getElementById('s_name').value='';
  document.getElementById('s_class').value='';
  document.getElementById('s_roll').value='';
  document.getElementById('s_phone').value='';
  document.getElementById('s_fee').value='';
}

function renderAttendance(){
  area.innerHTML = `
    <div class="h6">Mark Attendance</div>
    <div class="form-row">
      <input id="att_date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <input id="att_roll" placeholder="Roll / Student ID">
      <div class="row"><label><input id="att_present" type="checkbox"> Present</label></div>
      <button class="primary" onclick="markAttendance()">Mark</button>
      <div id="att_msg" class="note"></div>
      <div id="att_list" class="note"></div>
    </div>
  `;
  loadAttendanceList();
}

async function markAttendance(){
  const date = document.getElementById('att_date').value;
  const roll = document.getElementById('att_roll').value.trim();
  const present = document.getElementById('att_present').checked;

  if(!date || !roll){ document.getElementById('att_msg').innerText='Date & roll required'; return; }
  const { error } = await supabase.from('attendance').insert({ id: genId(), date, roll, present });
  if(error){ document.getElementById('att_msg').innerText = error.message; return; }
  document.getElementById('att_msg').innerText = 'Marked';
  document.getElementById('att_roll').value='';
  loadAttendanceList();
}

async function loadAttendanceList(){
  const { data, error } = await supabase.from('attendance').select('*').order('created_at', { ascending:false }).limit(50);
  if(error){ document.getElementById('att_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('att_list').innerText = 'No records yet'; return; }
  let html = '<table class="table"><tr><th>Date</th><th>Roll</th><th>Present</th></tr>';
  data.forEach(r => html += `<tr><td>${r.date}</td><td>${r.roll}</td><td>${r.present ? 'Yes':'No'}</td></tr>`);
  html += '</table>';
  document.getElementById('att_list').innerHTML = html;
}

function renderFees(){
  area.innerHTML = `
    <div class="h6">Update Fee</div>
    <div class="form-row">
      <input id="f_roll" placeholder="Student Roll / ID">
      <input id="f_amount" placeholder="Amount">
      <select id="f_method"><option>Cash</option><option>UPI</option><option>Card</option></select>
      <button class="primary" onclick="saveFee()">Save Fee</button>
      <div id="f_msg" class="note"></div>
      <div id="fee_list" class="note"></div>
    </div>
  `;
  loadFeesList();
}

async function saveFee(){
  const roll = document.getElementById('f_roll').value.trim();
  const amount = parseFloat(document.getElementById('f_amount').value);
  const method = document.getElementById('f_method').value;

  if(!roll || isNaN(amount)){ document.getElementById('f_msg').innerText='Roll & numeric amount required'; return; }
  const { data: student } = await supabase.from('students').select('id,feePaid').eq('roll', roll).limit(1);
  if(!student || !student.length){ document.getElementById('f_msg').innerText='Student not found'; return; }
  const sid = student[0].id;
  const cur = parseFloat(student[0].feePaid || 0);
  const newAmt = cur + amount;

  const { error } = await supabase.from('students').update({ feePaid: newAmt }).eq('id', sid);
  if(error){ document.getElementById('f_msg').innerText = error.message; return; }

  await supabase.from('fees').insert({ id: genId(), student_id: sid, amount, method });
  document.getElementById('f_msg').innerText = 'Fee recorded';
  loadFeesList();
}

async function loadFeesList(){
  const { data, error } = await supabase.from('fees').select('*').order('paid_on', { ascending:false }).limit(50);
  if(error){ document.getElementById('fee_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('fee_list').innerText = 'No fees yet'; return; }
  let html = '<table class="table"><tr><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr>';
  for(const f of data){
    let name = f.student_id;
    try{
      const res = await supabase.from('students').select('name').eq('id', f.student_id).limit(1);
      if(res.data && res.data.length) name = res.data[0].name;
    }catch(e){}
    html += `<tr><td>${name}</td><td>${f.amount}</td><td>${f.method}</td><td>${new Date(f.paid_on).toLocaleString()}</td></tr>`;
  }
  html += '</table>';
  document.getElementById('fee_list').innerHTML = html;
}

function renderHomework(){
  area.innerHTML = `
    <div class="h6">Upload Homework</div>
    <div class="form-row">
      <input id="hw_title" placeholder="Title (optional)">
      <input id="hw_file" type="file">
      <button class="primary" onclick="uploadHomework()">Upload</button>
      <div id="hw_msg" class="note"></div>
      <div id="hw_list" class="note"></div>
    </div>
  `;
  loadHomeworkList();
}

async function uploadHomework(){
  const fileInput = document.getElementById('hw_file');
  const title = document.getElementById('hw_title').value || '';
  if(!fileInput.files.length){ document.getElementById('hw_msg').innerText='Choose file'; return; }
  const file = fileInput.files[0];
  const path = `homework/${genId()}_${file.name}`;
  const { error } = await supabase.storage.from('homework').upload(path, file, { upsert: true });
  if(error){ document.getElementById('hw_msg').innerText = error.message; return; }

  const { data: urlData } = supabase.storage.from('homework').getPublicUrl(path);
  const publicUrl = urlData ? urlData.publicUrl : null;

  await supabase.from('homework').insert({ id: genId(), title, file_url: publicUrl, date: new Date().toISOString().slice(0,10) });
  document.getElementById('hw_msg').innerText = 'Uploaded';
  fileInput.value = '';
  loadHomeworkList();
}

async function loadHomeworkList(){
  const { data, error } = await supabase.from('homework').select('*').order('date', { ascending:false }).limit(50);
  if(error){ document.getElementById('hw_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('hw_list').innerText = 'No homework'; return; }
  let html = '<ul>';
  data.forEach(h => {
    html += `<li>${h.title || 'File'} — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`;
  });
  html += '</ul>';
  document.getElementById('hw_list').innerHTML = html;
}

function renderNotice(){
  area.innerHTML = `
    <div class="h6">Post Notice</div>
    <div class="form-row">
      <input id="notice_msg" placeholder="Notice text">
      <button class="primary" onclick="postNotice()">Post</button>
      <div id="notice_info" class="note"></div>
      <div id="notice_list" class="note"></div>
    </div>
  `;
  loadNotices();
}

async function postNotice(){
  const msg = document.getElementById('notice_msg').value.trim();
  if(!msg){ document.getElementById('notice_info').innerText = 'Enter notice'; return; }
  const { error } = await supabase.from('notices').insert({ id: genId(), message: msg, date: new Date().toISOString().slice(0,10) });
  if(error){ document.getElementById('notice_info').innerText = error.message; return; }
  document.getElementById('notice_info').innerText = 'Posted';
  document.getElementById('notice_msg').value='';
  loadNotices();
}

async function loadNotices(){
  const { data, error } = await supabase.from('notices').select('*').order('date', { ascending:false }).limit(50);
  if(error){ document.getElementById('notice_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('notice_list').innerText = 'No notices'; return; }
  let html = '<ul>';
  data.forEach(n => html += `<li>${n.message} <span class="kv">(${n.date})</span></li>`);
  html += '</ul>';
  document.getElementById('notice_list').innerHTML = html;
}

function renderTeacherPanel(){
  area.innerHTML = `
    <div class="h6">Teacher Panel</div>
    <div class="form-row">
      <input id="t_class" placeholder="Enter class (eg 10th)">
      <button class="primary" onclick="loadClassStudents()">Load Students</button>
      <div id="teacher_list" class="note"></div>
    </div>
  `;
}

async function loadClassStudents(){
  const cls = document.getElementById('t_class').value.trim();
  if(!cls){ document.getElementById('teacher_list').innerText='Enter class'; return; }
  const { data, error } = await supabase.from('students').select('*').eq('class', cls).order('name');
  if(error){ document.getElementById('teacher_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('teacher_list').innerText='No students'; return; }
  let html = '<table class="table"><tr><th>Roll</th><th>Name</th><th>Present</th></tr>';
  data.forEach(s => {
    html += `<tr><td>${s.roll}</td><td>${s.name}</td><td><button onclick="markAttendanceFor('${s.roll}', true)" class="small">P</button> <button onclick="markAttendanceFor('${s.roll}', false)" class="small">A</button></td></tr>`;
  });
  html += '</table>';
  document.getElementById('teacher_list').innerHTML = html;
}

async function markAttendanceFor(roll, present){
  const { error } = await supabase.from('attendance').insert({ id: genId(), date: new Date().toISOString().slice(0,10), roll, present });
  if(error) alert(error.message);
  else alert('Marked');
}  const fee = document.getElementById('s_fee').value || 0;

  if(!name || !roll){
    document.getElementById('s_msg').innerText = 'Name and roll required';
    return;
  }

  const id = genId();
  const { error } = await supabase.from('students').insert({
    id, name, class: cls, phone, roll, feePaid: fee
  });
  if(error){
    document.getElementById('s_msg').innerText = error.message;
    return;
  }
  document.getElementById('s_msg').innerText = 'Student added';
  // clear
  document.getElementById('s_name').value='';
  document.getElementById('s_class').value='';
  document.getElementById('s_roll').value='';
  document.getElementById('s_phone').value='';
  document.getElementById('s_fee').value='';
}

// --- Attendance ---
function renderAttendance(){
  area.innerHTML = `
    <div class="h6">Mark Attendance</div>
    <div class="form-row">
      <input id="att_date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <input id="att_roll" placeholder="Roll / Student ID">
      <div class="row">
        <label><input id="att_present" type="checkbox"> Present</label>
      </div>
      <button class="primary" onclick="markAttendance()">Mark</button>
      <div id="att_msg" class="note"></div>
      <div id="att_list" class="note"></div>
    </div>
  `;
  loadAttendanceList();
}

async function markAttendance(){
  const date = document.getElementById('att_date').value;
  const roll = document.getElementById('att_roll').value.trim();
  const present = document.getElementById('att_present').checked;

  if(!date || !roll){
    document.getElementById('att_msg').innerText = 'Date and roll required';
    return;
  }

  const { error } = await supabase.from('attendance').insert({
    id: genId(), date, roll, present
  });
  if(error){
    document.getElementById('att_msg').innerText = error.message;
    return;
  }
  document.getElementById('att_msg').innerText = 'Marked';
  document.getElementById('att_roll').value='';
  loadAttendanceList();
}

async function loadAttendanceList(){
  const { data, error } = await supabase.from('attendance').select('*').order('paid_on', { ascending: false }).limit(50);
  if(error){ document.getElementById('att_list').innerText = error.message; return; }
  if(!data || !data.length) { document.getElementById('att_list').innerText = 'No records yet'; return; }
  let html = '<table class="table"><tr><th>Date</th><th>Roll</th><th>Present</th></tr>';
  data.forEach(r => {
    html += `<tr><td>${r.date}</td><td>${r.roll}</td><td>${r.present ? 'Yes':'No'}</td></tr>`;
  });
  html += '</table>';
  document.getElementById('att_list').innerHTML = html;
}

// --- Fees ---
function renderFees(){
  area.innerHTML = `
    <div class="h6">Update Fee</div>
    <div class="form-row">
      <input id="f_roll" placeholder="Student Roll / ID">
      <input id="f_amount" placeholder="Amount">
      <select id="f_method"><option>Cash</option><option>UPI</option><option>Card</option></select>
      <button class="primary" onclick="saveFee()">Save Fee</button>
      <div id="f_msg" class="note"></div>
      <div id="fee_list" class="note"></div>
    </div>
  `;
  loadFeesList();
}

async function saveFee(){
  const roll = document.getElementById('f_roll').value.trim();
  const amount = parseFloat(document.getElementById('f_amount').value);
  const method = document.getElementById('f_method').value;

  if(!roll || isNaN(amount)){
    document.getElementById('f_msg').innerText = 'Roll and numeric amount required';
    return;
  }
  // update student feePaid (simple add)
  // fetch current
  const { data: student } = await supabase.from('students').select('id,feePaid').eq('roll', roll).limit(1);
  if(!student || !student.length){ document.getElementById('f_msg').innerText = 'Student not found'; return; }
  const sid = student[0].id;
  const cur = parseFloat(student[0].feePaid || 0);
  const newAmt = cur + amount;

  const { error } = await supabase.from('students').update({ feePaid: newAmt }).eq('id', sid);
  if(error){ document.getElementById('f_msg').innerText = error.message; return; }

  // record in fees table
  await supabase.from('fees').insert({ id: genId(), student_id: sid, amount, method });

  document.getElementById('f_msg').innerText = 'Fee recorded';
  loadFeesList();
}

async function loadFeesList(){
  const { data, error } = await supabase.from('fees').select('*').order('paid_on', { ascending:false }).limit(50);
  if(error){ document.getElementById('fee_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('fee_list').innerText = 'No fees yet'; return; }
  let html = '<table class="table"><tr><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr>';
  for(const f of data){
    // try to get student name
    let name = f.student_id;
    try{
      const res = await supabase.from('students').select('name').eq('id', f.student_id).limit(1);
      if(res.data && res.data.length) name = res.data[0].name;
    }catch(e){}
    html += `<tr><td>${name}</td><td>${f.amount}</td><td>${f.method}</td><td>${new Date(f.paid_on).toLocaleString()}</td></tr>`;
  }
  html += '</table>';
  document.getElementById('fee_list').innerHTML = html;
}

// --- Homework ---
function renderHomework(){
  area.innerHTML = `
    <div class="h6">Upload Homework</div>
    <div class="form-row">
      <input id="hw_title" placeholder="Title (optional)">
      <input id="hw_file" type="file">
      <button class="primary" onclick="uploadHomework()">Upload</button>
      <div id="hw_msg" class="note"></div>
      <div id="hw_list" class="note"></div>
    </div>
  `;
  loadHomeworkList();
}

async function uploadHomework(){
  const fileInput = document.getElementById('hw_file');
  const title = document.getElementById('hw_title').value || '';
  if(!fileInput.files.length){ document.getElementById('hw_msg').innerText='Choose file'; return; }
  const file = fileInput.files[0];
  const path = `homework/${genId()}_${file.name}`;
  const { error } = await supabase.storage.from('homework').upload(path, file, { upsert: true });
  if(error){ document.getElementById('hw_msg').innerText = error.message; return; }

  // get public URL
  const { data: urlData } = supabase.storage.from('homework').getPublicUrl(path);
  const publicUrl = urlData ? urlData.publicUrl : null;

  await supabase.from('homework').insert({ id: genId(), title, file_url: publicUrl, date: new Date().toLocaleDateString() });
  document.getElementById('hw_msg').innerText = 'Uploaded';
  fileInput.value = '';
  loadHomeworkList();
}

async function loadHomeworkList(){
  const { data, error } = await supabase.from('homework').select('*').order('date', { ascending:false }).limit(50);
  if(error){ document.getElementById('hw_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('hw_list').innerText = 'No homework'; return; }
  let html = '<ul>';
  data.forEach(h => {
    html += `<li>${h.title || 'File'} — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`;
  });
  html += '</ul>';
  document.getElementById('hw_list').innerHTML = html;
}

// --- Notices ---
function renderNotice(){
  area.innerHTML = `
    <div class="h6">Post Notice</div>
    <div class="form-row">
      <input id="notice_msg" placeholder="Notice text">
      <button class="primary" onclick="postNotice()">Post</button>
      <div id="notice_info" class="note"></div>
      <div id="notice_list" class="note"></div>
    </div>
  `;
  loadNotices();
}

async function postNotice(){
  const msg = document.getElementById('notice_msg').value.trim();
  if(!msg){ document.getElementById('notice_info').innerText = 'Enter notice'; return; }
  const { error } = await supabase.from('notices').insert({ id: genId(), message: msg, date: new Date().toLocaleDateString() });
  if(error){ document.getElementById('notice_info').innerText = error.message; return; }
  document.getElementById('notice_info').innerText = 'Posted';
  document.getElementById('notice_msg').value='';
  loadNotices();
}

async function loadNotices(){
  const { data, error } = await supabase.from('notices').select('*').order('date', { ascending:false }).limit(50);
  if(error){ document.getElementById('notice_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('notice_list').innerText = 'No notices'; return; }
  let html = '<ul>';
  data.forEach(n => html += `<li>${n.message} <span class="kv">(${n.date})</span></li>`);
  html += '</ul>';
  document.getElementById('notice_list').innerHTML = html;
}

// --- Teacher panel (simple) ---
function renderTeacherPanel(){
  area.innerHTML = `
    <div class="h6">Teacher Panel</div>
    <div class="form-row">
      <input id="t_class" placeholder="Enter class (eg 10th)">
      <button class="primary" onclick="loadClassStudents()">Load Students</button>
      <div id="teacher_list" class="note"></div>
    </div>
  `;
}

async function loadClassStudents(){
  const cls = document.getElementById('t_class').value.trim();
  if(!cls){ document.getElementById('teacher_list').innerText='Enter class'; return; }
  const { data, error } = await supabase.from('students').select('*').eq('class', cls).order('name');
  if(error){ document.getElementById('teacher_list').innerText = error.message; return; }
  if(!data || !data.length){ document.getElementById('teacher_list').innerText='No students'; return; }
  let html = '<table class="table"><tr><th>Roll</th><th>Name</th><th>Present</th></tr>';
  data.forEach(s => {
    html += `<tr><td>${s.roll}</td><td>${s.name}</td><td><button onclick="markAttendanceFor('${s.roll}', true)" class="small">P</button> <button onclick="markAttendanceFor('${s.roll}', false)" class="small">A</button></td></tr>`;
  });
  html += '</table>';
  document.getElementById('teacher_list').innerHTML = html;
}

async function markAttendanceFor(roll, present){
  const { error } = await supabase.from('attendance').insert({ id: genId(), date: new Date().toLocaleDateString(), roll, present });
  if(error) alert(error.message);
  else alert('Marked');
    }    area.innerHTML = `
      <h3>Upload Homework</h3>
      <input type="file" id="hwFile">
      <button onclick="uploadHW()">Upload</button>
    `;
  }
  else if(type === 'notice'){
    area.innerHTML = `
      <h3>New Notice</h3>
      <textarea id="nt" placeholder="Write Notice"></textarea>
      <button onclick="postNotice()">Post</button>
    `;
  }
};

// Add Student
window.addStudent = async function(){
  const {error} = await supabaseClient.from('students').insert({
    id: sroll.value,
    name: sname.value,
    class: sclass.value,
    phone: sphone.value
  });

  if(error) return alert(error.message);
  alert("Student Added");
};

// Attendance
window.markPresent = async function(){
  const {error} = await supabaseClient.from('attendance').insert({
    date: date.value,
    roll: roll.value,
    present: true
  });

  if(error) return alert(error.message);
  alert("Attendance Saved");
};

// Fee Update
window.updateFee = async function(){
  const { error } = await supabaseClient
    .from('students')
    .update({ feePaid: paid.value })
    .eq('id', froll.value);

  if(error) return alert(error.message);
  alert("Fee Updated");
};

// Upload Homework
window.uploadHW = async function(){
  let file = hwFile.files[0];
  let name = Date.now()+"-"+file.name;

  let { data, error } = await supabaseClient
    .storage.from("homework")
    .upload(name, file);

  if(error) return alert(error.message);

  let url = supabaseClient.storage.from("homework").getPublicUrl(name).data.publicUrl;

  await supabaseClient.from("homework").insert({ url });

  alert("Uploaded!");
};

// Notice
window.postNotice = async function(){
  const {error} = await supabaseClient.from("notices").insert({
    text: nt.value
  });

  if(error) return alert(error.message);
  alert("Notice Posted!");
};
