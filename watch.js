/* ===========================
   SUPABASE CONFIG
=========================== */
const SUPABASE_URL = "https://exjgejujfxejjlbfizgz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLk4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y";

let supabaseClient = null;

/* ===========================
   GLOBAL STATE
=========================== */
const state = {
  movie: null,
  episodes: [],
};

/* ===========================
   BOOTSTRAP APP
=========================== */
document.addEventListener("DOMContentLoaded", bootstrap);

function bootstrap() {
  if (!initializeSupabase()) return;

  const movieId = getMovieId();
  if (!movieId) {
    console.error("Missing movie ID in URL");
    return;
  }

  startApp(movieId);
}

/* ===========================
   INITIALIZATION
=========================== */
function initializeSupabase() {
  if (!window.supabase) {
    console.error("Supabase SDK not loaded");
    alert("Failed to load application services");
    return false;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  return true;
}

/* ===========================
   APP FLOW
=========================== */
async function startApp(movieId) {
  try {
    setupLoadingScreen();

    await loadMovie(movieId);

    setupUI();
  } catch (err) {
    console.error("App failed to start:", err);
  }
}

/* ===========================
   HELPERS
=========================== */
function getMovieId() {
  return new URLSearchParams(window.location.search).get("id");
}

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.innerText = value || "";
}

function setAttr(id, attr, value) {
  const el = $(id);
  if (el && value) el.setAttribute(attr, value);
}

/* ===========================
   LOAD MOVIE
=========================== */
async function loadMovie(id) {
  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  state.movie = data;

  renderMovie(data);

  if (data.type === "series") {
    $("series-section").style.display = "block";
    loadEpisodes(data.id);
  } else {
    $("series-section").style.display = "none";
  }

  loadComments(data.id);
  loadRecommended();
}

/* ===========================
   RENDER MOVIE UI
=========================== */
function renderMovie(movie) {
  document.title = movie.title;

  setText("movie-title", movie.title);
  setText("movie-year", movie.year);
  setText("movie-description", movie.description);
  setText("movie-category", `🎭 ${movie.category || "Entertainment"}`);
  setText("movie-translator", `🎙 ${movie.translator || "KivuStream"}`);
  setText("movie-type", movie.type === "series" ? "📺 Series" : "🎬 Movie");
  setText("movie-status", movie.status || "🔥 Trending");

  setAttr("movie-poster", "src", movie.image || "./logo.png");

  const backdrop = document.querySelector(".hero-backdrop");
  if (backdrop) {
    backdrop.style.backgroundImage = `url(${movie.banner || movie.image})`;
  }

  document.body.style.setProperty(
    "--movie-bg",
    `url(${movie.banner || movie.image})`
  );

  setupPlayer(movie);
  setupDownload(movie);
  setupComments(movie.id);
}

/* ===========================
   PLAYER
=========================== */
function setupPlayer(movie) {
  const btn = $("watch-btn");
  if (!btn) return;

  btn.onclick = () => {
    const player = $("player");
    if (!player) return;

    player.src = movie.video;
    player.play().catch(() => {});
    player.scrollIntoView({ behavior: "smooth" });
  };
}

/* ===========================
   DOWNLOAD
=========================== */
function setupDownload(movie) {
  const btn = $("download-btn");
  if (!btn) return;

  btn.onclick = () => {
    if (movie.download) {
      window.open(movie.download, "_blank");
    }
  };
}

/* ===========================
   SERIES EPISODES
=========================== */
async function loadEpisodes(seriesId) {
  const { data, error } = await supabaseClient
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId)
    .order("season");

  if (error) return console.error(error);

  state.episodes = data;

  const seasons = [...new Set(data.map(e => e.season))];
  const container = $("season-buttons");

  if (!container) return;

  container.innerHTML = "";

  seasons.forEach(season => {
    const btn = document.createElement("button");
    btn.textContent = `Season ${season}`;
    btn.onclick = () => renderSeason(season);
    container.appendChild(btn);
  });

  renderSeason(seasons[0]);
}

function renderSeason(season) {
  const container = $("episodes-container");
  if (!container) return;

  container.innerHTML = "";

  const episodes = state.episodes.filter(e => e.season == season);

  episodes.forEach(ep => {
    const card = document.createElement("div");
    card.className = "episode-card";

    card.innerHTML = `
      <div class="episode-left">
        <span>EP ${ep.episode}</span>
        <div>
          <h3>${ep.title}</h3>
          <small>Season ${ep.season}</small>
        </div>
      </div>

      <div class="episode-actions">
        <button class="watch">▶</button>
        <button class="download">⬇</button>
      </div>
    `;

    card.querySelector(".watch").onclick = () => playEpisode(ep.video);
    card.querySelector(".download").onclick = () => window.open(ep.download);

    container.appendChild(card);
  });
}

function playEpisode(video) {
  const player = $("player");
  if (!player) return;

  player.src = video;
  player.play().catch(() => {});
  player.scrollIntoView({ behavior: "smooth" });
}

/* ===========================
   COMMENTS SYSTEM
=========================== */
function setupComments(movieId) {
  const btn = $("comment-btn");
  if (!btn) return;

  btn.onclick = () => postComment(movieId);

  loadComments(movieId);
}

async function loadComments(movieId) {
  const container = $("comments-container");
  if (!container) return;

  const { data } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("movie_id", movieId)
    .order("created_at", { ascending: false });

  container.innerHTML = "";

  (data || []).forEach(c => {
    container.innerHTML += `
      <div class="comment">
        <strong>${c.username}</strong>
        <p>${c.text}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      </div>
    `;
  });
}

async function postComment(movieId) {
  const textInput = $("comment-input");
  const userInput = $("username-input");
  const btn = $("comment-btn");

  const username = userInput?.value.trim() || "Guest";
  const text = textInput?.value.trim();

  if (!text) return alert("Write a comment");

  try {
    btn.disabled = true;
    btn.innerText = "Posting...";

    await supabaseClient
      .from("comments")
      .insert([{ movie_id: movieId, username, text }]);

    textInput.value = "";
    loadComments(movieId);

  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerText = "Post";
  }
}

/* ===========================
   RECOMMENDED
=========================== */
async function loadRecommended() {
  const { data } = await supabaseClient
    .from("movies")
    .select("*")
    .limit(12);

  const container = $("recommended-container");
  if (!container) return;

  container.innerHTML = "";

  (data || []).forEach(m => {
    const div = document.createElement("div");
    div.className = "movie-card";

    div.innerHTML = `
      <img src="${m.image}" />
      <h3>${m.title}</h3>
    `;

    div.onclick = () => (window.location.href = `watch.html?id=${m.id}`);

    container.appendChild(div);
  });
}

/* ===========================
   LOADING SCREEN
=========================== */
function setupLoadingScreen() {
  window.addEventListener("load", () => {
    const loader = $("loading-screen");
    if (loader) loader.remove();
  });
}
