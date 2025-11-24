const supabaseClient = supabase.createClient(
  "https://gqkklssatkwpgqhgqymz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2tsc3NhdGt3cGdxaGdxeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTMwMDcsImV4cCI6MjA3OTQ4OTAwN30.M0BnJSwNDAU90wIqSxi_gBU0tyutvLNxBTHkM-YyVpc"
);

const hwDiv = document.getElementById("hw");
const noticeDiv = document.getElementById("notices");

async function loadHomework(){
  const { data } = await supabaseClient.from("homework").select("*");

  data.forEach(hw=>{
    hwDiv.innerHTML += `<a href="${hw.url}" target="_blank">Homework File</a><br>`;
  });
}

async function loadNotices(){
  const { data } = await supabaseClient.from("notices").select("*");

  data.forEach(n=>{
    noticeDiv.innerHTML += `<p>${n.text}</p>`;
  });
}

loadHomework();
loadNotices();