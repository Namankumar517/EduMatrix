const supabaseClient = supabase.createClient(
  "https://gqkklssatkwpgqhgqymz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2tsc3NhdGt3cGdxaGdxeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTMwMDcsImV4cCI6MjA3OTQ4OTAwN30.M0BnJSwNDAU90wIqSxi_gBU0tyutvLNxBTHkM-YyVpc"
);

const area = document.getElementById("area");

// Dynamic UI Loader
window.show = function(type){
  if(type === 'addStudent'){
    area.innerHTML = `
      <h3>Add Student</h3>
      <input id="sname" placeholder="Name">
      <input id="sclass" placeholder="Class">
      <input id="sphone" placeholder="Parent Phone">
      <input id="sroll" placeholder="Roll No">
      <button onclick="addStudent()">Add</button>
    `;
  }
  else if(type === 'attendance'){
    area.innerHTML = `
      <h3>Mark Attendance</h3>
      <input type="date" id="date">
      <input id="roll" placeholder="Roll No">
      <button onclick="markPresent()">Present</button>
    `;
  }
  else if(type === 'fees'){
    area.innerHTML = `
      <h3>Update Fee</h3>
      <input id="froll" placeholder="Roll">
      <input id="paid" placeholder="Paid Amount">
      <button onclick="updateFee()">Save</button>
    `;
  }
  else if(type === 'homework'){
    area.innerHTML = `
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