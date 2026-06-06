console.log("WATCH JS VERSION 2026");
/* ===========================
   CONFIG
=========================== */
const SUPABASE_URL = "https://exjgejujfxejjlbfizgz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLk4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y";

let supabaseClient = null;
/* ==========================
   TMDB
========================== */

const TMDB_API_KEY =
"8b8937bf3e114fa3502358a4f090c0df";

const TMDB_BASE =
"https://api.themoviedb.org/3";

const TMDB_POSTER =
"https://image.tmdb.org/t/p/w500";

const TMDB_BACKDROP =
"https://image.tmdb.org/t/p/original";

async function searchTMDBMovies(query) {

  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );

  const data = await res.json();

  return data.results || [];
}

async function getTMDBMovieDetails(id) {

  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}`
  );

  const data = await res.json();

  return {

    poster: data.poster_path
      ? TMDB_POSTER + data.poster_path
      : null,

    banner: data.backdrop_path
      ? TMDB_BACKDROP + data.backdrop_path
      : null,

    overview: data.overview,

    rating: data.vote_average
  };
}
async function searchTMDBSeries(query) {

  const res = await fetch(
    `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );

  const data = await res.json();

  return data.results || [];
}

async function getTMDBSeriesDetails(id) {

  const res = await fetch(
    `${TMDB_BASE}/tv/${id}?api_key=${TMDB_API_KEY}`
  );

  const data = await res.json();

  return {

    poster: data.poster_path
      ? TMDB_POSTER + data.poster_path
      : null,

    banner: data.backdrop_path
      ? TMDB_BACKDROP + data.backdrop_path
      : null,

    description: data.overview,

    rating: data.vote_average,

    year: data.first_air_date
      ? data.first_air_date.slice(0,4)
      : null
  };
}
async function enrichMovieWithTMDB(movie) {

  if (!movie.title) return movie;

  const results =
    await searchTMDBMovies(movie.title);

  if (!results.length) return movie;

  const tmdb =
    await getTMDBMovieDetails(results[0].id);

  return {

    ...movie,

    poster:
      tmdb.poster || movie.image,

    banner:
      tmdb.banner || movie.banner,

    description:
      tmdb.overview || movie.description,

    rating:
      tmdb.rating || movie.rating
  };
}
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
let movie = null;

/* TRY MOVIES */
const { data: movieData } = await supabaseClient
  .from("movies")
  .select("*")
  .eq("id", id)
  .single();

if (movieData) {
  movie = movieData;
}

/* TRY SERIES IF MOVIE NOT FOUND */
if (!movie) {
  const { data: seriesData } = await supabaseClient
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  if (seriesData) {
    movie = {
      ...seriesData,
      type: "series"
    };
  }
}

console.log("Movie ID:", id);
console.log("Loaded Item:", movie);

if (!movie) {

  document.getElementById("loading-screen")?.remove();

  document.body.innerHTML += `
    <div style="
      color:white;
      text-align:center;
      padding:40px;
    ">
      Content not found.
    </div>
  `;

  return;
}
   
try {

  if(movie.type === "series") {

    const results =
      await searchTMDBSeries(movie.title);

    console.log("TMDB Series Results:", results);

    if(results.length) {

      const tmdb =
        await getTMDBSeriesDetails(results[0].id);

      movie = {

        ...movie,

        poster:
          tmdb.poster || movie.poster || movie.image,

        banner:
          tmdb.banner || movie.banner || movie.image,

        description:
          tmdb.description || movie.description,

        rating:
          tmdb.rating || movie.rating,

        year:
          tmdb.year || movie.year

      };

    }

  } else {

    movie =
      await enrichMovieWithTMDB(movie);

  }

  console.log("Movie After TMDB:", movie);

} catch(err) {

  console.log("TMDB Error:", err);

}

state.movie = movie;

renderMovie(movie);

  if (movie.type === "series") {

  const section =
    $("series-section");

  if (section) {
    section.style.display = "block";
  }

  loadEpisodes(movie.id);
}

loadComments(movie.id);
  loadRecommended();

document.getElementById("loading-screen")?.remove();
}

/* ===========================
   RENDER
=========================== */
function renderMovie(movie) {
  console.log("Poster URL:", movie.image);
  console.log("Banner URL:", movie.banner);

  document.title = movie.title;

  $("movie-title").innerText = movie.title;
  $("movie-year").innerText = movie.year;
  $("movie-description").innerText = movie.description;
  $("movie-category").innerText = movie.category || "Entertainment";
  $("movie-translator").innerText = movie.translator || "KivuStream";
  $("movie-type").innerText =
    movie.type === "series" ? "Series" : "Movie";

  const poster = $("movie-poster");

  poster.src =
  movie.poster ||
  movie.image ||
  "./logo.png";

  poster.onerror = () => {
    console.error("Poster failed:", movie.image);
    poster.src = "./logo.png";
  };

  const bg =
movie.banner ||
movie.poster ||
movie.image ||
"./logo.png";

  document.querySelector(".hero-backdrop").style.backgroundImage =
    `url("${bg}")`;
console.log("TMDB Poster:", movie.poster);
console.log("TMDB Banner:", movie.banner);
console.log("Supabase Image:", movie.image);
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

    let links = movie.download_links;

    if (!links) {

      if (movie.download) {
        window.open(movie.download, "_blank");
      }

      return;
    }

    if (typeof links === "string") {
      links = JSON.parse(links);
    }

    let choices = "";

    links.forEach((item, index) => {
      choices += `${index + 1}. ${item.name}\n`;
    });

    const selected = prompt(
      "Choose download:\n\n" + choices
    );

    const item =
      links[parseInt(selected) - 1];

    if (item) {
      window.open(item.url, "_blank");
    }
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
    .filter(ep => ep.season == season)
    .forEach(ep => {

      const card = document.createElement("div");
      card.className = "episode-card";

      card.innerHTML = `
        <div class="episode-badge">
         EP ${ep.episode_number}
        </div>

       <h3>Episode ${ep.episode_number}</h3>

        <div class="episode-actions">

          <button class="watch-episode">
            ▶ Watch
          </button>

          <button class="download-episode">
            ⬇ Download
          </button>

        </div>
      `;

      /* WATCH */
      card.querySelector(".watch-episode").onclick = () => {

        $("player").src = ep.video;

        $("player").play().catch(() => {});

        $("player").scrollIntoView({
          behavior: "smooth"
        });

      };

      /* DOWNLOAD */
      card.querySelector(".download-episode").onclick = () => {

        if (ep.download) {
          window.open(ep.download, "_blank");
          return;
        }

        if (ep.download_url) {
          window.open(ep.download_url, "_blank");
          return;
        }

        if (ep.download_link) {
          window.open(ep.download_link, "_blank");
          return;
        }

        alert("Download link not found.");
      };

      container.appendChild(card);
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
async function loadRecommended() {

  const { data } = await supabaseClient
    .from("movies")
    .select("*")
    .limit(10);

  const box = $("recommended-container");
  box.innerHTML = "";

  for (const movie of (data || [])) {

    let m = movie;

    try {
      m = await enrichMovieWithTMDB(movie);
    } catch (err) {
      console.log("TMDB recommendation error:", err);
    }

    const img =
      m.poster ||
      m.image ||
      "./logo.png";

    const div = document.createElement("div");
    div.className = "movie-card";

    div.innerHTML = `
      <img src="${img}">
      <h3>${m.title}</h3>
    `;

    div.querySelector("img").onerror = () => {
      div.querySelector("img").src = "./logo.png";
    };

    div.onclick = () => {
      window.location.href =
        `watch.html?id=${m.id}`;
    };

    box.appendChild(div);
  }
}

/* ===========================
   LOADING SCREEN
=========================== */
function setupLoadingScreen() {
  window.addEventListener("load", () => {
    $("loading-screen")?.remove();
  });
}
