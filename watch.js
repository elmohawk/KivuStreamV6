/* =========================
   SUPABASE INIT
========================= */
const supabaseClient = supabase.createClient(
  "https://exjgejujfxejjlbfizgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLp4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y"
);

/* =========================
   STATE
========================= */
let currentMovie = null;
let allEpisodes = [];

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", loadMovie);

/* =========================
   LOAD MOVIE
========================= */
async function loadMovie() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return console.error(error);

  currentMovie = data;
  renderMovie();
}

/* =========================
   RENDER MOVIE
========================= */
function renderMovie() {
  const m = currentMovie;
  if (!m) return;

  document.title = m.title;

  set("movie-title", m.title);
  set("movie-description", m.description);

  setHTML("movie-category", `🎭 ${m.category || "N/A"}`);
  setHTML("movie-translator", `🎙 ${m.translator || "KivuStream"}`);
  setHTML("movie-type", m.type === "series" ? "📺 Series" : "🎬 Movie");

  setAttr("movie-poster", "src", m.image || "./logo.png");

  const backdrop = document.querySelector(".hero-backdrop");
  if (backdrop) {
    backdrop.style.backgroundImage = `url(${m.banner || m.image})`;
  }

  document.body.style.setProperty("--movie-bg", `url(${m.banner || m.image})`);

  setHTML("movie-status", m.status || "🔥 Trending");

  setupPlayer(m);
  setupDownload(m);
  setupComments(m.id);
  setupWatchType(m);

  loadRecommended();
}

/* =========================
   PLAYER
========================= */
function setupPlayer(m) {
  const btn = document.getElementById("watch-btn");
  const player = document.getElementById("player");

  if (!btn || !player) return;

  btn.onclick = () => {
    if (!m.video) return;

    player.src = m.video;
    player.play().catch(() => {});

    player.scrollIntoView({ behavior: "smooth" });
  };
}

/* =========================
   DOWNLOAD
========================= */
function setupDownload(m) {
  const btn = document.getElementById("download-btn");
  if (!btn) return;

  btn.onclick = () => {
    if (m.download) window.open(m.download, "_blank");
  };
}

/* =========================
   SERIES CHECK
========================= */
function setupWatchType(m) {
  if (m.type !== "series") {
    document.getElementById("series-section").style.display = "none";
  }
}

/* =========================
   COMMENTS
========================= */
function setupComments(movieId) {
  document.getElementById("comment-btn").onclick = () =>
    postComment(movieId);

  loadComments(movieId);
}

async function loadComments(movieId) {
  const { data } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("movie_id", movieId)
    .order("created_at", { ascending: false });

  const box = document.getElementById("comments-container");
  if (!box) return;

  box.innerHTML = "";

  (data || []).forEach(c => {
    box.innerHTML += `
      <div class="comment">
        <strong>${c.username}</strong>
        <p>${c.text}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      </div>
    `;
  });
}

async function postComment(movieId) {
  const user = document.getElementById("username-input");
  const text = document.getElementById("comment-input");
  const btn = document.getElementById("comment-btn");

  if (!text.value.trim()) return alert("Write comment first");

  btn.disabled = true;
  btn.innerText = "Posting...";

  await supabaseClient.from("comments").insert([{
    movie_id: movieId,
    username: user.value || "Guest",
    text: text.value
  }]);

  text.value = "";
  loadComments(movieId);

  btn.disabled = false;
  btn.innerText = "🚀 Post";
}

/* =========================
   RECOMMENDED
========================= */
async function loadRecommended() {
  const { data } = await supabaseClient
    .from("movies")
    .select("*")
    .limit(10);

  const box = document.getElementById("recommended-container");
  if (!box) return;

  box.innerHTML = "";

  (data || []).forEach(m => {
    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <img src="${m.image}" />
      <h3>${m.title}</h3>
    `;

    card.onclick = () => location.href = `watch.html?id=${m.id}`;

    box.appendChild(card);
  });
}

/* =========================
   HELPERS
========================= */
function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}

/* =========================
   LOADER
========================= */
window.addEventListener("load", () => {
  document.getElementById("loading-screen")?.remove();
});
