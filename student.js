// student.js
// simple student view (shows homework, notices, attendance for current user)
// If you want to show student's own attendance, the page expects the student to enter roll in prompt (or you can store current user id)
async function loadStudentData(){
  // homework
  const { data: hw, error: e1 } = await supabase.from('homework').select('*').order('date', { ascending:false }).limit(50);
  const hwDiv = document.getElementById('hw');
  if(e1){ hwDiv.innerText = e1.message; } else {
    if(!hw || !hw.length) hwDiv.innerText = 'No homework';
    else {
      let html = '<ul>';
      hw.forEach(h => html += `<li>${h.title || 'File'} — <a href="${h.file_url}" target="_blank">Open</a> <span class="kv">(${h.date})</span></li>`);
      html += '</ul>';
      hwDiv.innerHTML = html;
    }
  }

  // notices
  const { data: ns, error: e2 } = await supabase.from('notices').select('*').order('date', { ascending:false }).limit(50);
  const nDiv = document.getElementById('notices');
  if(e2) nDiv.innerText = e2.message;
  else {
    if(!ns || !ns.length) nDiv.innerText = 'No notices';
    else {
      let html = '<ul>';
      ns.forEach(n => html += `<li>${n.message} <span class="kv">(${n.date})</span></li>`);
      html += '</ul>';
      nDiv.innerHTML = html;
    }
  }

  // attendance (ask for roll)
  const roll = prompt('Enter your roll / id to view attendance (eg: 1)');
  const attDiv = document.getElementById('myAttendance');
  if(!roll){ attDiv.innerText = 'No roll given'; return; }
  const { data: at, error: e3 } = await supabase.from('attendance').select('*').eq('roll', roll).order('date', { ascending:false });
  if(e3) attDiv.innerText = e3.message;
  else {
    if(!at || !at.length) attDiv.innerText = 'No records';
    else {
      let present = at.filter(r => r.present).length;
      let total = at.length;
      attDiv.innerHTML = `Present: ${present} / ${total} (${Math.round((present/total)*100||0)}%)<br><table class="table"><tr><th>Date</th><th>Present</th></tr>`;
      at.forEach(r => attDiv.innerHTML += `<tr><td>${r.date}</td><td>${r.present ? 'Yes':'No'}</td></tr>`);
      attDiv.innerHTML += `</table>`;
    }
  }
}

window.addEventListener('load', loadStudentData);
