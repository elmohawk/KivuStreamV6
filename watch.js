/* ---------------------------
   SUPABASE CONFIG
----------------------------*/
const SUPABASE_URL = "https://exjgejujfxejjlbfizgz.supabase.co";
const SUPABASE_KEY = "YOUR_ANON_KEY";

// Create client safely
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/* ---------------------------
   GLOBAL STATE
----------------------------*/
let currentMovie = null;
let allEpisodes = [];

/* ---------------------------
   INIT APP
----------------------------*/
document.addEventListener("DOMContentLoaded", init);

function init() {
  if (!supabaseClient) {
    console.error("Supabase failed to initialize");
    alert("Database connection failed");
    return;
  }

  const id = getMovieId();

  if (!id) {
    console.error("No movie ID found");
    return;
  }

  loadMovie(id);
  setupLoadingScreen();
}

/* ---------------------------
   HELPERS
----------------------------*/
function getMovieId() {
  return new URLSearchParams(window.location.search).get("id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value || "";
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}

/* ---------------------------
   LOAD MOVIE
----------------------------*/
async function loadMovie(id) {
  try {
    const { data, error } = await supabaseClient
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return alert("Movie not found");

    currentMovie = data;

    renderMovie(data);

    if (data.type === "series") {
      document.getElementById("series-section").style.display = "block";
      loadSeriesEpisodes(data.id);
    } else {
      document.getElementById("series-section").style.display = "none";
    }

    loadComments(data.id);
    loadRecommended();

  } catch (err) {
    console.error(err);
    alert("Failed to load movie");
  }
}

/* ---------------------------
   RENDER MOVIE
----------------------------*/
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
  setupCommentButton(movie.id);
}

/* ---------------------------
   PLAYER
----------------------------*/
function setupPlayer(movie) {
  const btn = document.getElementById("watch-btn");

  if (!btn) return;

  btn.onclick = () => {
    const player = document.getElementById("player");
    if (!player) return;

    player.src = movie.video;
    player.play();
    player.scrollIntoView({ behavior: "smooth" });
  };
}

/* ---------------------------
   DOWNLOAD
----------------------------*/
function setupDownload(movie) {
  const btn = document.getElementById("download-btn");
  if (!btn) return;

  btn.onclick = () => {
    if (movie.download) {
      window.open(movie.download, "_blank");
    }
  };
}

/* ---------------------------
   SERIES
----------------------------*/
async function loadSeriesEpisodes(seriesId) {
  try {
    const { data, error } = await supabaseClient
      .from("episodes")
      .select("*")
      .eq("series_id", seriesId)
      .order("season");

    if (error) throw error;
    if (!data) return;

    allEpisodes = data;

    const seasons = [...new Set(data.map(e => e.season))];
    const container = document.getElementById("season-buttons");

    if (!container) return;

    container.innerHTML = "";

    seasons.forEach(season => {
      const btn = document.createElement("button");
      btn.textContent = `Season ${season}`;
      btn.onclick = () => showSeason(season);
      container.appendChild(btn);
    });

    showSeason(seasons[0]);

    if (data.length > 0) {
      playEpisode(data[0].video);
    }

  } catch (err) {
    console.error("Episode load failed", err);
  }
}

function showSeason(season) {
  const container = document.getElementById("episodes-container");
  if (!container) return;

  container.innerHTML = "";

  const episodes = allEpisodes.filter(ep => ep.season == season);

  episodes.forEach(ep => {
    const card = document.createElement("div");
    card.className = "episode-card";

    card.innerHTML = `
      <div class="episode-left">
        <span class="episode-number">EP ${ep.episode}</span>
        <div>
          <h3>${ep.title}</h3>
          <small>Season ${ep.season}</small>
        </div>
      </div>

      <div class="episode-actions">
        <button class="watch-ep">▶ Watch</button>
        <button class="download-ep">⬇</button>
      </div>
    `;

    card.querySelector(".watch-ep").onclick = () => playEpisode(ep.video);
    card.querySelector(".download-ep").onclick = () => {
      if (ep.download) window.open(ep.download);
    };

    container.appendChild(card);
  });
}

function playEpisode(video) {
  const player = document.getElementById("player");
  if (!player) return;

  player.src = video;
  player.play();
  player.scrollIntoView({ behavior: "smooth" });
}

/* ---------------------------
   RECOMMENDED
----------------------------*/
async function loadRecommended() {
  try {
    const { data } = await supabaseClient
      .from("movies")
      .select("*")
      .limit(12);

    const container = document.getElementById("recommended-container");
    if (!container || !data) return;

    container.innerHTML = "";

    data.forEach(movie => {
      const card = document.createElement("div");
      card.className = "movie-card";

      card.innerHTML = `
        <img src="${movie.image}" />
        <h3>${movie.title}</h3>
      `;

      card.onclick = () => openMovie(movie.id);
      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
  }
}

function openMovie(id) {
  window.location.href = `watch.html?id=${id}`;
}

/* ---------------------------
   COMMENTS
----------------------------*/
function setupCommentButton(movieId) {
  const btn = document.getElementById("comment-btn");
  if (!btn) return;

  btn.onclick = () => postComment(movieId);
}

async function loadComments(movieId) {
  const container = document.getElementById("comments-container");
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
        <strong>${c.username || "User"}</strong>
        <p>${c.text}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      </div>
    `;
  });
}

async function postComment(movieId) {
  const textInput = document.getElementById("comment-input");
  const userInput = document.getElementById("username-input");
  const btn = document.getElementById("comment-btn");

  const username = userInput?.value.trim() || "Guest";
  const text = textInput?.value.trim();

  if (!text) return alert("Please write a comment.");

  try {
    btn.disabled = true;
    btn.innerText = "⏳ Posting...";

    const { error } = await supabaseClient
      .from("comments")
      .insert([{ movie_id: movieId, username, text }]);

    if (error) throw error;

    textInput.value = "";
    loadComments(movieId);

  } catch (err) {
    console.error(err);
    alert("Failed to post comment");
  } finally {
    btn.disabled = false;
    btn.innerText = "🚀 Post";
  }
}

/* ---------------------------
   LOADING SCREEN
----------------------------*/
function setupLoadingScreen() {
  window.addEventListener("load", () => {
    const loader = document.getElementById("loading-screen");
    if (loader) loader.remove();
  });
}
