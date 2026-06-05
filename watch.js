console.log("WATCH JS VERSION 2026");
/* ===========================
   CONFIG
=========================== */
const SUPABASE_URL = "https://exjgejujfxejjlbfizgz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLk4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y";

let supabaseClient = null;

/* ===========================
   STATE
=========================== */
const state = {
  movie: null,
  episodes: [],
};

/* ===========================
   SAFE INIT (NO CRASH ZONE)
=========================== */
document.addEventListener("DOMContentLoaded", async () => {
  await waitForSupabase();
  bootstrap();
});

/* Wait until Supabase is available */
function waitForSupabase(retries = 20) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.supabase) {
        clearInterval(interval);
        supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );
         console.log("Supabase loaded successfully");
console.log(supabaseClient);
        resolve(true);
      }

      if (--retries <= 0) {
        clearInterval(interval);
        console.error("Supabase failed to load");
        resolve(false);
      }
    }, 100);
  });
}

/* ===========================
   BOOTSTRAP
=========================== */
function bootstrap() {
  const movieId = getMovieId();
  if (!movieId) return;

  startApp(movieId);
}

/* ===========================
   APP FLOW
=========================== */
async function startApp(movieId) {
  try {
    setupLoadingScreen();
    await loadMovie(movieId);
  } catch (err) {
    console.error("App error:", err);
  }
}

/* ===========================
   HELPERS
=========================== */
function getMovieId() {
  return new URLSearchParams(window.location.search).get("id");
}

const $ = (id) => document.getElementById(id);

async function loadMovie(id) {
  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();
console.log("Movie ID:", id);
console.log("Movie Data:", data);
console.log("Movie Error:", error);
  if (error || !data) {
    console.error("Movie load failed:", error);

document.getElementById("loading-screen")?.remove();

    document.body.innerHTML += `
      <div style="color:white;text-align:center;padding:40px">
        Movie not found or database error.
      </div>
    `;

    return;
  }

  state.movie = data;

  renderMovie(data);

  if (data.type === "series") {
    $("series-section").style.display = "block";
    loadEpisodes(data.id);
  }

  loadComments(data.id);
  loadRecommended();

document.getElementById("loading-screen")?.remove();
}

/* ===========================
   RENDER
=========================== */
function renderMovie(movie) {
  document.title = movie.title;

  $("movie-title").innerText = movie.title;
  $("movie-year").innerText = movie.year;
  $("movie-description").innerText = movie.description;
  $("movie-category").innerText = movie.category || "Entertainment";
  $("movie-translator").innerText = movie.translator || "KivuStream";
  $("movie-type").innerText =
    movie.type === "series" ? "Series" : "Movie";

  $("movie-poster").src = movie.image || "./logo.png";

  const bg = movie.banner || movie.image;

  document.querySelector(".hero-backdrop").style.backgroundImage =
    `url(${bg})`;

  document.body.style.setProperty("--movie-bg", `url(${bg})`);

  setupPlayer(movie);
  setupDownload(movie);
}

/* ===========================
   PLAYER
=========================== */
function setupPlayer(movie) {
  $("watch-btn").onclick = () => {
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
  $("download-btn").onclick = () => {
    if (movie.download) window.open(movie.download, "_blank");
  };
}

/* ===========================
   EPISODES
=========================== */
async function loadEpisodes(seriesId) {
  const { data } = await supabaseClient
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId);

  if (!data) return;

  state.episodes = data;

  const seasons = [...new Set(data.map((e) => e.season))];

  const container = $("season-buttons");
  container.innerHTML = "";

  seasons.forEach((s) => {
    const btn = document.createElement("button");
    btn.innerText = "Season " + s;
    btn.onclick = () => renderSeason(s);
    container.appendChild(btn);
  });

  renderSeason(seasons[0]);
}

function renderSeason(season) {
  const container = $("episodes-container");
  container.innerHTML = "";

  state.episodes
    .filter((e) => e.season == season)
    .forEach((ep) => {
      const div = document.createElement("div");
      div.className = "episode-card";

      div.innerHTML = `
        <h3>${ep.title}</h3>
        <button>▶ Watch</button>
      `;

      div.querySelector("button").onclick = () => {
        $("player").src = ep.video;
        $("player").play().catch(() => {});
      };

      container.appendChild(div);
    });
}

/* ===========================
   COMMENTS
=========================== */
function loadComments(movieId) {
  supabaseClient
    .from("comments")
    .select("*")
    .eq("movie_id", movieId)
    .then(({ data }) => {
      const box = $("comments-container");
      box.innerHTML = "";

      (data || []).forEach((c) => {
        box.innerHTML += `
          <div class="comment">
            <strong>${c.username}</strong>
            <p>${c.text}</p>
          </div>
        `;
      });
    });
}

/* ===========================
   RECOMMENDED
=========================== */
function loadRecommended() {
  supabaseClient
    .from("movies")
    .select("*")
    .limit(10)
    .then(({ data }) => {
      const box = $("recommended-container");
      box.innerHTML = "";

      (data || []).forEach((m) => {
        const div = document.createElement("div");
        div.className = "movie-card";

        div.innerHTML = `<img src="${m.image}"><h3>${m.title}</h3>`;

        div.onclick = () =>
          (window.location.href = `watch.html?id=${m.id}`);

        box.appendChild(div);
      });
    });
}

/* ===========================
   LOADING SCREEN
=========================== */
function setupLoadingScreen() {
  window.addEventListener("load", () => {
    $("loading-screen")?.remove();
  });
}
