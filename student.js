// student.js — loads homework, notices, and shows attendance for entered roll
console.log("STUDENT JS LOADED");

async function loadHomework(){
  const { data, error } = await supabase.from('homework').select('*').order('date', { ascending:false }).limit(50);
  const hwDiv = document.getElementById('hw');
  if(error){ hwDiv.innerText = error.message; return; }
  if(!data || !data.length){ hwDiv.innerText = 'No homework'; return; }
  let html = '<ul>';
  data.forEach(h => html += `<li><b>${h.title || 'File'}</b> — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`);
  html += '</ul>';
  hwDiv.innerHTML = html;
}

async function loadNotices(){
  const { data, error } = await supabase.from('notices').select('*').order('date', { ascending:false }).limit(50);
  const nDiv = document.getElementById('notices');
  if(error){ nDiv.innerText = error.message; return; }
  if(!data || !data.length){ nDiv.innerText = 'No notices'; return; }
  let html = '<ul>';
  data.forEach(n => html += `<li>${n.message} <span class="kv">(${n.date})</span></li>`);
  html += '</ul>';
  nDiv.innerHTML = html;
}

async function viewMyAttendance(){
  const roll = document.getElementById('viewRoll').value.trim();
  const attDiv = document.getElementById('myAttendance');
  if(!roll){ attDiv.innerText = 'Enter roll'; return; }
  const { data, error } = await supabase.from('attendance').select('*').eq('roll', roll).order('date', { ascending:false });
  if(error){ attDiv.innerText = error.message; return; }
  if(!data || !data.length){ attDiv.innerText = 'No records'; return; }
  const present = data.filter(r => r.present).length;
  const total = data.length;
  let html = `Present: ${present} / ${total} (${Math.round((present/total)*100||0)}%)<br>`;
  html += '<table class="table"><tr><th>Date</th><th>Present</th></tr>';
  data.forEach(r => html += `<tr><td>${r.date}</td><td>${r.present ? 'Yes' : 'No'}</td></tr>`);
  html += '</table>';
  attDiv.innerHTML = html;
}

window.addEventListener('load', ()=>{
  loadHomework();
  loadNotices();
});
