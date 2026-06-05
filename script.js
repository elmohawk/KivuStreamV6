
/* =========================
   TMDB API INTEGRATION
========================= */

const TMDB_API_KEY = "8b8937bf3e114fa3502358a4f090c0df";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_POSTER = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/original";

async function searchTMDBMovies(query) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );

  const data = await res.json();
  return data.results || [];
}
async function getTMDBMovieDetails(id) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos`
  );

  const data = await res.json();

  return {
    title: data.title,
    overview: data.overview,
    poster: data.poster_path
      ? TMDB_POSTER + data.poster_path
      : null,

    banner: data.backdrop_path
      ? TMDB_BACKDROP + data.backdrop_path
      : null,

    rating: data.vote_average,
    release: data.release_date,
    trailer:
      data.videos?.results?.find(v => v.type === "Trailer")?.key || null
  };
}
async function enrichMovieWithTMDB(movie) {
  if (!movie.title) return movie;

  const results = await searchTMDBMovies(movie.title);

  if (results.length === 0) return movie;

  const tmdb = await getTMDBMovieDetails(results[0].id);

  return {
    ...movie,
    poster: tmdb.poster || movie.poster,
    banner: tmdb.banner || movie.banner,
    overview: tmdb.overview || movie.description,
    rating: tmdb.rating,
    trailer: tmdb.trailer
  };
}
const tmdbCache = new Map();

async function cachedTMDB(id, title) {
  if (tmdbCache.has(title)) {
    return tmdbCache.get(title);
  }

  const result = await enrichMovieWithTMDB({ id, title });

  tmdbCache.set(title, result);

  return result;
}


(function () {

  const debugPanel =
    document.getElementById("debug-panel");

  function showSite() {

    const loader =
      document.getElementById("loader");

    const app =
      document.getElementById("app");

    if (loader) {
      loader.style.display = "none";
    }

    if (app) {
      app.style.visibility = "visible";
    }
  }

  function logError(error) {

    console.error(error);

    if (debugPanel) {

      debugPanel.style.display = "block";

      debugPanel.innerHTML +=
        "<div>" +
        String(error) +
        "</div>";
    }

    showSite();
  }

  window.onerror = function (
    message,
    source,
    line,
    col,
    error
  ) {

    logError(
      `${message} @ line ${line}`
    );

    return false;
  };

  window.addEventListener(
    "unhandledrejection",
    (event) => {

      logError(event.reason);
    }
  );

  window.addEventListener(
    "DOMContentLoaded",
    () => {

      showSite();
    }
  );

  setTimeout(() => {

    showSite();

  }, 5000);

})();
/* ==================================
   EMERGENCY BOOT MODE
================================== */
window.onerror = function (msg, url, line, col, error) {
  console.error("APP ERROR:", msg, error);

  const loader = document.getElementById("loader");

  if (loader) {
    loader.style.display = "none";
  }

  document.body.style.visibility = "visible";

  alert(`ERROR: ${msg} | Line: ${line}`);

  return false;
};

window.addEventListener("unhandledrejection", (e) => {
  console.error("PROMISE ERROR:", e.reason);

  const loader = document.getElementById("loader");

  if (loader) {
    loader.style.display = "none";
  }
});

/* =========================
   SUPABASE
========================= */

const supabaseUrl = "https://exjgejujfxejjlbfizgz.supabase.co";

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLk4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/* =========================
   STATE
========================= */

window.allMovies = [];
let allMovies = window.allMovies;
let currentMovie = null;
let currentHero = null;

/* =========================
   DOM HELPER
========================= */

const $ = (id) => document.getElementById(id);

/* =========================
   LOAD MOVIES
========================= */

async function loadMovies() {
  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  const enrichedMovies = await Promise.all(
    (data || []).map(movie =>
      cachedTMDB(movie.id, movie.title)
    )
  );

  allMovies = enrichedMovies;
  window.allMovies = enrichedMovies;

  renderAll(enrichedMovies);

  initHero(enrichedMovies);

  setTimeout(() => {
    enableLazyImages();
    enableCardEffects();
  }, 100);
}

async function loadEpisodes(seriesId) {
  const { data, error } = await supabaseClient
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId)
    .order("season", { ascending: true })
    .order("episode", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  const container = $("episodes-container");

  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <p class="no-episodes">
        No Episodes Available
      </p>
    `;

    return;
  }

  container.innerHTML = data
    .map(
      (ep) => `

      <div class="episode-card">

        <div class="episode-top">

          <span class="episode-badge">
            S${ep.season}
          </span>

          <span class="episode-badge blue">
            EP ${ep.episode}
          </span>

        </div>

        <h4>${ep.title}</h4>

        <div class="episode-actions">

          <button
            class="watch-episode-btn"
            onclick="watchEpisode('${ep.video}')">

            ▶ Watch

          </button>

          <button
            class="download-episode-btn"
            onclick="window.open('${ep.download}')">

            ⬇ Download

          </button>

        </div>

      </div>

    `
    )
    .join("");
}
/* =========================
   RENDER ALL
========================= */

function renderAll(movies) {
  renderPaginatedRow(
    "movies-container",
    movies.filter((m) => m.type === "movie")
  );

  renderPaginatedRow(
    "series-container",
    movies.filter((m) => m.type === "series")
  );

  renderPaginatedRow(
    "action-container",
    movies.filter((m) => m.category === "Action")
  );

  renderPaginatedRow(
    "horror-container",
    movies.filter((m) => m.category === "Horror")
  );

  renderPaginatedRow(
    "comedy-container",
    movies.filter((m) => m.category === "Comedy")
  );

  renderPaginatedRow(
    "drama-container",
    movies.filter((m) => m.category === "Drama")
  );

  renderPaginatedRow(
    "scifi-container",
    movies.filter((m) => m.category === "Sci-Fi")
  );

  renderPaginatedRow(
    "highschool-container",
    movies.filter((m) => m.category === "HighSchool")
  );

  renderPaginatedRow(
    "animation-container",
    movies.filter((m) => m.category === "Animation")
  );

  renderPaginatedRow("recent-slider", movies.slice(0, 20));

  renderPaginatedRow("updates-container", movies.slice(0, 15));
}
/* =========================
   RENDER ROW
========================= */

function renderRow(id, items) {
  const container = $(id);

  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = "<p>No content</p>";

    return;
  }

  items.forEach((movie) => {
    container.appendChild(createMovieCard(movie));
  });
}

/* =========================
   CREATE MOVIE CARD
========================= */

function createMovieCard(movie) {
  const card = document.createElement("div");

  card.className = "movie-card";

  card.onclick = () => openMovie(movie.id);

  card.innerHTML = `

    <div class="movie-badge ${movie.type === "series" ? "series" : ""}">
      ${movie.type === "series" ? "SERIES" : "MOVIE"}
    </div>

  <img
  src="${movie.poster || movie.image || './logo.png'}"
  alt="${movie.title}"
  loading="lazy"
  onerror="this.onerror=null;this.src='./logo.png';"
/>

    <div class="movie-overlay">

      <button class="play-btn">
        ▶
      </button>

    </div>

    <div class="movie-info">

      <h3>${movie.title}</h3>

      <p>
        ${truncateText(movie.description || "", 70)}
      </p>

      <div class="movie-meta">

  <span>⭐ ${movie.rating || "8.5"}</span>

  <span>${movie.year || "2026"}</span>

</div>

<div class="translator-tag">

  🎙 ${movie.translator || "KivuStream"}

</div>

  `;

  return card;
}

/* ========================
   HERO SLIDER
========================= */

let heroIndex = 0;
let heroMovies = [];
let heroInterval = null;

function initHero(movies) {
  heroMovies = movies || [];
  if (heroMovies.length === 0) return;

  heroIndex = 0;
  currentHero = heroMovies[0];

  renderHero();

  clearInterval(heroInterval);

  heroInterval = setInterval(() => {
    nextHero();
  }, 6000);
}

function renderHero() {
  const hero = document.getElementById("hero-slider");
  if (!hero || !currentHero) return;

 hero.style.backgroundImage = `linear-gradient(
  to right,
  rgba(0,0,0,.85),
  rgba(0,0,0,.2)
),
url(${currentHero.banner || currentHero.poster || currentHero.image})`;
   
  const title =
 document.getElementById(
   "hero-title"
 );

if (title) {
  title.innerText =
    currentHero.title;
}

  document.getElementById("hero-description").innerText =
    currentHero.description || "";
}

function nextHero() {
  heroIndex++;

  if (heroIndex >= heroMovies.length) {
    heroIndex = 0;
  }

  currentHero = heroMovies[heroIndex];
  renderHero();
}

function prevHero() {
  heroIndex--;

  if (heroIndex < 0) {
    heroIndex = heroMovies.length - 1;
  }

  currentHero = heroMovies[heroIndex];

  renderHero();
}

/* =========================
   HERO BUTTONS
========================= */

function watchHero() {
  if (!currentHero) return;

  currentMovie = currentHero;

  watchMovie();
}

function openHeroInfo() {
  if (!currentHero) return;

  openMovie(currentHero.id);
}

function openMovie(id) {
  window.location.href = `watch.html?id=${id}`;
}

/* =========================
   CLOSE INFO
========================= */

function closeInfo() {
  $("info-modal").style.display = "none";
}

/* =========================
   WATCH MOVIE
========================= */

function watchMovie() {
  if (!currentMovie) return;

  $("watch-modal").style.display = "flex";

  const player = $("player");

  player.pause();
  player.removeAttribute("src");
  player.load();

  player.src = currentMovie.video;
}
function watchEpisode(video) {
  $("watch-modal").style.display = "flex";

  $("player").src = video;
}

/* =========================
   CLOSE PLAYER
========================= */

function closePlayer() {
  $("watch-modal").style.display = "none";

  const player = $("player");

  player.pause();

  player.src = "";
}

/* =========================
   DOWNLOAD
========================= */

function downloadMovie() {
  if (!currentMovie?.download) {
    alert("No download link");
    return;
  }

  window.open(currentMovie.download, "_blank");
}

/* =========================
   SHARE
========================= */

function shareMovie() {
  if (!currentMovie) return;

  if (navigator.share) {
    navigator.share({
      title: currentMovie.title,
      text: "Watch on KivuStream",
      url: window.location.href
    });
  } else {
    showToast("Sharing not supported");
  }
}

/* =========================
   LIKE
========================= */

async function likeMovie() {
  if (!currentMovie) return;

  await supabaseClient.from("likes").insert([
    {
      movie_id: currentMovie.id
    }
  ]);

  alert("❤️ Liked");
}

/* =========================
   COMMENTS
========================= */

async function addComment() {
  const text = $("commentInput").value;

  if (!text || !currentMovie) return;

  await supabaseClient.from("comments").insert([
    {
      movie_id: currentMovie.id,
      comment: text
    }
  ]);

  $("commentInput").value = "";

  loadComments(currentMovie.id);
}

async function loadComments(movieId) {
  const { data } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("movie_id", movieId)
    .order("created_at", { ascending: false });

  $("comments-list").innerHTML = (data || [])
    .map(
      (c) => `
  <p>💬 ${c.comment}</p>
`
    )
    .join("");
}

("use strict");

/* =========================================
   KIVUSTREAM AI SEARCH ENGINE PRO
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");

  if (!searchInput) {
    console.warn("Search input not found");
    return;
  }

  /* =========================
     CREATE SEARCH CONTAINER
  ========================= */

  const searchResults = document.createElement("div");

  searchResults.className = "search-results";

  document.body.appendChild(searchResults);

  /* =========================
     SEARCH STATE
  ========================= */

  let debounceTimer = null;
  let selectedIndex = -1;

  /* =========================
     ESCAPE HTML
  ========================= */

  function escapeHTML(text) {
    text = String(text || "");

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* =========================
     HIGHLIGHT TEXT
  ========================= */

  function highlightMatch(
  text,
  keyword
) {
  if (!keyword) return text;

  const escaped =
    keyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex =
    new RegExp(
      `(${escaped})`,
      "gi"
    );

  return text.replace(
    regex,
    '<span class="search-highlight">$1</span>'
  );
}

  /* =========================
     HIDE SEARCH
  ========================= */

  function hideSearch() {
    searchResults.style.display = "none";

    selectedIndex = -1;
  }

  /* =========================
     RENDER SEARCH RESULTS
  ========================= */

  function renderResults(results, keyword) {
    searchResults.innerHTML = "";

    /* NO RESULTS */

    if (!results.length) {
      searchResults.innerHTML = `

        <div class="search-empty">

          🎬 No movies found

        </div>

      `;

      searchResults.style.display = "block";

      return;
    }

    /* LIMIT RESULTS */

    results.slice(0, 10).forEach((movie, index) => {
      const card = document.createElement("div");

      card.className = "search-card";

      card.dataset.index = index;

      card.innerHTML = `

        <img
          src="${escapeHTML(movie.image || "fallback.jpg")}"
          alt="${escapeHTML(movie.title || "Movie")}"
          loading="lazy"
        >

        <div class="search-info">

          <h4>

            ${highlightMatch(escapeHTML(movie.title || "Untitled"), keyword)}

          </h4>

          <p>

            ${highlightMatch(escapeHTML(movie.category || "Movie"), keyword)}

          </p>

        </div>

      `;

      card.addEventListener("click", () => {
        openMovie(movie.id);

        hideSearch();
      });

      searchResults.appendChild(card);
    });

    searchResults.style.display = "block";
  }

  /* =========================
     SEARCH ENGINE
  ========================= */

  function performSearch(value) {
    const keyword = value.toLowerCase().trim();

    if (!keyword) {
      hideSearch();

      return;
    }

    const movies = window.allMovies || [];

    const filtered = movies.filter((movie) => {
      return (
        (movie.title || "").toLowerCase().includes(keyword) ||
        (movie.category || "").toLowerCase().includes(keyword) ||
        (movie.description || "").toLowerCase().includes(keyword)
      );
    });

    renderResults(filtered, keyword);
  }

  /* =========================
     INPUT SEARCH
  ========================= */

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      performSearch(e.target.value);
    }, 180);
  });

  /* =========================
     KEYBOARD NAVIGATION
  ========================= */

  searchInput.addEventListener("keydown", (e) => {
    const cards = searchResults.querySelectorAll(".search-card");

    if (!cards.length) return;

    /* DOWN */

    if (e.key === "ArrowDown") {
      e.preventDefault();

      selectedIndex++;

      if (selectedIndex >= cards.length) {
        selectedIndex = 0;
      }
    } else if (e.key === "ArrowUp") {
      /* UP */
      e.preventDefault();

      selectedIndex--;

      if (selectedIndex < 0) {
        selectedIndex = cards.length - 1;
      }
    } else if (e.key === "Enter") {
      /* ENTER */
      e.preventDefault();

      if (selectedIndex >= 0) {
        cards[selectedIndex].click();
      }
    } else if (e.key === "Escape") {
      /* ESC */
      hideSearch();
    }

    cards.forEach((card) => card.classList.remove("active"));

    if (cards[selectedIndex]) {
      cards[selectedIndex].classList.add("active");

      cards[selectedIndex].scrollIntoView({
        block: "nearest"
      });
    }
  });

  /* =========================
     CLICK OUTSIDE
  ========================= */

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".search-results") &&
      !e.target.closest("#search-input")
    ) {
      hideSearch();
    }
  });

  /* =========================
     AUTO CLOSE MOBILE
  ========================= */

  window.addEventListener("resize", () => {
    if (window.innerWidth < 768) {
      hideSearch();
    }
  });
});

/* =========================
   SUPABASE ADMIN AUTH
========================= */

async function adminLogin() {
  const email = document.getElementById("admin-email").value.trim();

  const password = document.getElementById("admin-password").value.trim();

  const msg = document.getElementById("admin-msg");

  /* EMPTY CHECK */

  if (!email || !password) {
    msg.innerHTML = "⚠ Fill all fields";
    msg.style.color = "#ff4d4d";

    return;
  }

  showLoader();

  /* LOGIN */

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  hideLoader();

  /* ERROR */

  if (error) {
    msg.innerHTML = "❌ Invalid email or password";

    msg.style.color = "#ff4d4d";

    console.log(error);

    return;
  }

  /* SUCCESS */

  if (data.user) {
    localStorage.setItem("kivustream_admin", "true");

    msg.innerHTML = "✅ Welcome IT HAWK";

    msg.style.color = "#00ff99";

    closeAdminLogin();

    openAdminPanel();

    loadDashboardStats();

    showToast("✅ Welcome IT HAWK");
  }
}

/* =========================
   OPEN ADMIN PANEL
========================= */

async function openAdminPanel() {
  const { data } = await supabaseClient.auth.getUser();

  console.log("Logged in user:", data.user);
  console.log("Email:", data.user?.email);

  document.getElementById("admin-panel").style.display = "block";

  loadManageContent();
  loadDashboardStats();
  loadSeriesDropdown();
}

/* =========================
   ADMIN LOGOUT
========================= */

async function adminLogout() {
  /* SUPABASE LOGOUT */

  await supabaseClient.auth.signOut();

  /* CLEAR STORAGE */

  localStorage.removeItem("kivustream_admin");

  /* HIDE PANEL */

  const panel = document.getElementById("admin-panel");

  if (panel) {
    panel.style.display = "none";
  }

  /* CLOSE LOGIN */

  closeAdminLogin();

  /* SUCCESS */

  showToast("👋 Logged out");
}
/* =========================
   AUTO HIDE ADMIN PANEL
========================= */

window.addEventListener(
  "DOMContentLoaded",

  () => {
    /* ALWAYS HIDE PANEL */

    const panel = document.getElementById("admin-panel");

    if (panel) {
      panel.style.display = "none";
    }

    /* CLEAR OLD SESSION */

    localStorage.removeItem("kivustream_admin");
  }
);

/* =========================
   DASHBOARD STATS
========================= */

async function loadDashboardStats() {
  /* MOVIES */

  const { data: movies } = await supabaseClient.from("movies").select("*");

  /* SERIES */

  const series = (movies || []).filter((m) => m.type === "series");

  /* EPISODES */

  const { data: episodes } = await supabaseClient.from("episodes").select("*");

  /* UPDATE UI */

  document.getElementById("movies-count").innerText = (movies || []).length;

  document.getElementById("series-count").innerText = series.length;

  document.getElementById("episodes-count").innerText = (episodes || []).length;
}
/* =========================
   MOVIE UPLOAD (CREATE / UPDATE)
========================= */
async function uploadMoviePro() {
  try {
    showToast("Uploading...");

    let posterUrl = "";
    let bannerUrl = "";
    let videoUrl = "";

    const posterFile = $("movie-poster-file").files[0];
    const bannerFile = $("movie-banner-file").files[0];
    const videoFile = $("movie-video-file").files[0];

    if (posterFile) {
      posterUrl = await uploadImageToSupabase(posterFile, "posters");
    }

    if (bannerFile) {
      bannerUrl = await uploadImageToSupabase(bannerFile, "banners");
    }

    if (videoFile) {
      videoUrl = await uploadImageToSupabase(videoFile, "videos");
    }

    const movieData = {
      title: $("movie-title").value,
      description: $("movie-description").value,
      category: $("movie-category").value,
      type: $("movie-type").value,
      translator: $("movie-translator").value,
      download: $("movie-download").value,
      image: posterUrl,
      banner: bannerUrl,
      video: videoUrl
    };

    let result;

    /* EDIT MODE */
    if (editingMovieId) {
      result = await supabaseClient
        .from("movies")
        .update(movieData)
        .eq("id", editingMovieId);

      showToast("Updated successfully ✔");
      editingMovieId = null;

    } else {
      /* CREATE MODE */
      const table =
        movieData.type === "series" ? "series" : "movies";

      result = await supabaseClient
        .from(table)
        .insert([movieData]);

      showToast("Uploaded successfully ✔");
    }

  } catch (err) {
    console.error(err);
    showToast("Upload failed ❌", "error");
  }
}
/* =========================
   EDIT MOVIE (AUTO FILL + EDIT MODE)
========================= */

async function editMovie(id) {
  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.log(error);
    return;
  }

  /* FILL FORM */
  $("movie-title").value = data.title || "";
  $("movie-description").value = data.description || "";
  $("movie-category").value = data.category || "";
  $("movie-type").value = data.type || "";
  $("movie-translator").value = data.translator || "";
  $("movie-download").value = data.download || "";

  /* ENTER EDIT MODE */
  editingMovieId = id;

  showToast("Edit mode activated ✏️");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================
   ADD EPISODE (SERIES)
========================= */
async function addEpisode() {
  try {
    const series_id = $("series-id").value;
    const season_id = $("season-id").value;
    const episode_number = $("episode-number").value;
    const title = $("episode-title").value;
    const video_url = $("episode-video").value;
    const download_url = $("episode-download").value;

    if (!series_id || !season_id) {
      showToast("Select series + season");
      return;
    }

    await supabaseClient.from("episodes").insert([
      {
        series_id,
        season_id,
        episode_number,
        title,
        video_url,
        download_url
      }
    ]);

    showToast("Episode added ✔");
    loadEpisodesCount();

  } catch (err) {
    console.error(err);
    showToast("Failed to add episode ❌", "error");
  }
}
/* =========================
   STATS LOADER
========================= */

async function loadStats() {
  const { data: movies } = await supabaseClient
    .from("movies")
    .select("id, type");

  const { data: episodes } = await supabaseClient.from("episodes").select("id");

  let movieCount = 0;
  let seriesCount = 0;

  movies.forEach((m) => {
    if (m.type === "movie") movieCount++;
    if (m.type === "series") seriesCount++;
  });

  $("movies-count").innerText = movieCount;
  $("series-count").innerText = seriesCount;
  $("episodes-count").innerText = episodes.length;
}

/* =====================================================
   SERIES SYSTEM (CLEAN PRO VERSION)
===================================================== */

async function loadSeasons(seriesId) {
  const { data } = await supabaseClient
    .from("seasons")
    .select("*")
    .eq("series_id", seriesId);

  const select = $("season-id");

  if (!select) return;

  select.innerHTML = `<option value="">Select Season</option>`;

  (data || []).forEach((season) => {
    const option = document.createElement("option");

    option.value = season.season_number;
    option.textContent = "Season " + season.season_number;

    select.appendChild(option);
  });
}

function renderSeasonButtons(seasons, episodes) {
  const container = $("episodes-container");

  if (!container) return;

  const buttonsWrap = document.createElement("div");

  seasons.forEach((season) => {
    const btn = document.createElement("button");

    btn.className = "blue-btn";
    btn.innerText = "Season " + season;

    btn.onclick = () => renderEpisodes(season, episodes);

    buttonsWrap.appendChild(btn);
  });

  container.innerHTML = "";
  container.appendChild(buttonsWrap);
}

function renderEpisodes(season, episodes) {
  const container = $("episodes-container");

  if (!container) return;

  const filtered = episodes.filter((e) => e.season_number == season);

  const grid = document.createElement("div");

  grid.className = "episode-grid";

  filtered.forEach((ep) => {
    const card = document.createElement("div");

    card.className = "episode-card";

    card.innerHTML = `
      <h4>${ep.title}</h4>
      <p>Episode ${ep.episode_number}</p>
    `;

    card.onclick = () => playEpisode(ep);

    grid.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(grid);
}

function playEpisode(ep) {
  const player = $("player");

  if (!player) return;

  player.src = ep.video_url;
  player.play();
}

/* =========================
   REALTIME CHANNEL
========================= */

const movieChannel = supabaseClient.channel("movies-realtime");

/* =========================
   REALTIME LISTENER
========================= */

movieChannel
  .on(
    "postgres_changes",

    {
      event: "*",
      schema: "public",
      table: "movies"
    },

    async (payload) => {
      console.log("Realtime update:", payload);

      try {
        /* RELOAD MOVIES */

        await loadMovies();

        /* OPTIONAL TOAST */

        if (payload.eventType === "INSERT") {
          showToast("🎬 New movie uploaded");
        }

        if (payload.eventType === "DELETE") {
          showToast("🗑 Movie removed");
        }

        if (payload.eventType === "UPDATE") {
          showToast("✏ Movie updated");
        }
      } catch (error) {
        console.error("Realtime Error:", error);
      }
    }
  )

  /* =========================
   SUBSCRIBE
========================= */

  .subscribe((status) => {
    console.log("Realtime Status:", status);
  });

/* =========================
   AUTO RECONNECT
========================= */

window.addEventListener(
  "online",

  () => {
    console.log("Reconnecting realtime...");

    movieChannel.subscribe();
  }
);

/* =========================
   CLEANUP
========================= */

window.addEventListener(
  "beforeunload",

  async () => {
    await supabaseClient.removeChannel(movieChannel);
  }
);

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMovies();
});

/* =========================
   PERFORMANCE ENGINE
========================= */

const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;

      img.src = img.dataset.src;

      img.onload = () => {
        img.classList.add("loaded");
      };

      imageObserver.unobserve(img);
    }
  });
});

/* =========================
   APPLY LAZY LOADING
========================= */

function enableLazyImages() {
  document.querySelectorAll("img").forEach((img) => {
    if (img.dataset.src) {
      imageObserver.observe(img);
    }
  });
}

/* =========================
   NETFLIX CARD EFFECT
========================= */

function enableCardEffects() {
  document.querySelectorAll(".movie-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateY = (x / rect.width - 0.5) * 10;

      const rotateX = (y / rect.height - 0.5) * -10;

      card.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale(1.04)
      `;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* =========================
   SAVE CONTINUE WATCHING
========================= */

function saveContinueWatching(movie) {
  let watching = JSON.parse(localStorage.getItem("continueWatching")) || [];

  const exists = watching.find((x) => x.id == movie.id);

  watching = watching.filter((x) => x.id != movie.id);

  watching.unshift(movie);

  watching = watching.slice(0, 12);

  localStorage.setItem("continueWatching", JSON.stringify(watching));
}

/* =========================
   RENDER CONTINUE WATCHING
========================= */

function renderContinueWatching() {
  const container = $("continue-container");

  if (!container) return;

  const watching = JSON.parse(localStorage.getItem("continueWatching")) || [];

  container.innerHTML = "";

  watching.forEach((movie) => {
    container.innerHTML += `

      <div class="movie-card"
           onclick="openMovie('${movie.id}')">

        <img
          data-src="${movie.image}"
          alt="${movie.title}"
        >

        <div class="movie-info">

          <h3>${movie.title}</h3>

          <p>
            Continue Watching
          </p>

        </div>

      </div>

    `;
  });

  enableLazyImages();
}

/* =========================
   MOBILE SWIPE HERO
========================= */

let touchStartX = 0;
let touchEndX = 0;

const heroSlider = document.getElementById("hero-slider");

if (heroSlider) {
  heroSlider.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  heroSlider.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;

      handleHeroSwipe();
    },
    { passive: true }
  );
}

function handleHeroSwipe() {
  if (touchEndX < touchStartX - 50) {
    nextHero();
  }

  if (touchEndX > touchStartX + 50) {
    prevHero();
  }
}

/* =========================
   SMART IMAGE PRELOAD
========================= */

function preloadHeroImages() {
  if (!heroMovies) return;

  heroMovies.forEach((movie) => {
    const img = new Image();

    img.src = movie.banner || movie.image;
  });
}

/* =========================
   AUTO INIT
========================= */

window.addEventListener("load", () => {
  preloadHeroImages();

  enableLazyImages();

  enableCardEffects();

  renderContinueWatching();
});

/* =========================
   SAVE WHEN WATCHING
========================= */

const oldWatchMovie = watchMovie;

watchMovie = function () {
  if (currentMovie) {
    saveContinueWatching(currentMovie);
  }

  oldWatchMovie();
};

function truncateText(text, max) {
  if (text.length <= max) return text;

  return text.substring(0, max) + "...";
}

/* =========================
   LOAD MANAGE CONTENT
========================= */

async function loadManageContent() {
  const search = document.getElementById("manage-search").value.toLowerCase();

  const container = document.getElementById("manage-content-list");

  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.log(error);

    return;
  }

  let filtered = data.filter((movie) => {
    return movie.title.toLowerCase().includes(search);
  });

  container.innerHTML = filtered
    .map(
      (movie) => `

      <div class="manage-card">

        <img
          src="${movie.image}"
        >

        <div class="manage-info">

          <h4>
            ${movie.title}
          </h4>

          <p>
            ${movie.category}
          </p>

          <div class="manage-actions">

            <button
              class="edit-btn"
              onclick="editMovie('${movie.id}')"
            >

              ✏ Edit

            </button>

            <button
              class="delete-btn"
              onclick="deleteMovie('${movie.id}')"
            >

              🗑 Delete

            </button>

          </div>

        </div>

      </div>

    `
    )
    .join("");
}

/* =========================
   DELETE MOVIE
========================= */

async function deleteMovie(id) {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user || data.user.email !== "youradmin@gmail.com") {
    showToast("Access Denied");
    return;
  }

  const confirmDelete = confirm("Delete this content?");

  if (!confirmDelete) return;

  const { error } = await supabaseClient.from("movies").delete().eq("id", id);

  if (error) {
    alert(error.message);

    return;
  }

  loadManageContent();
}

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");

  if (!loader) return;

  loader.style.opacity = "0";

  setTimeout(() => {
    loader.style.display = "none";
  }, 300);
});

document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => {
    document
      .querySelectorAll(".navbar a")
      .forEach((l) => l.classList.remove("active"));

    link.classList.add("active");
  });
});

 function toggleMobileMenu() {

  const navbar =
    document.querySelector(
      ".navbar"
    );

  if (navbar) {
    navbar.classList.toggle(
      "show"
    );
  }
}

/* SMOOTH SCROLL */

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const target = document.querySelector(this.getAttribute("href"));

    if (target) {
      target.scrollIntoView({
        behavior: "smooth"
      });
    }
  });
});

/* =========================
   PRO TOAST
========================= */

function showToast(message, type = "success") {
  let toast = document.createElement("div");

  toast.className = `toast show ${type}`;

  toast.innerHTML = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

/* =========================
   LOADER
========================= */

function showLoader() {
  const loader = $("loader");

  if (loader) {
    loader.classList.remove("hide");
  }
}

function hideLoader() {
  const loader = $("loader");

  if (loader) {
    loader.classList.add("hide");
  }
}

/* =========================
   ADMIN LOGIN CONTROL (UPGRADED)
========================= */

function openAdminLogin() {
  const modal = document.getElementById("admin-login");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("show"); // optional for animation
  }
}

function closeAdminLogin() {
  const modal = document.getElementById("admin-login");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
  }
}

/* OPTIONAL: close when clicking outside box */
window.addEventListener("click", function (e) {
  const modal = document.getElementById("admin-login");

  if (e.target === modal) {
    closeAdminLogin();
  }
});

/* OPTIONAL: ESC key closes modal */
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeAdminLogin();
  }
});

/* =========================
   LOGO UPLOAD SYSTEM
========================= */

let selectedLogo = null;

/* =========================
   PREVIEW LOGO
========================= */
const logoInput = document.getElementById("logoFile");

if (logoInput) {
  logoInput.addEventListener("change", function (e) {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
      selectedLogo = event.target.result;

      const logo = document.getElementById("site-logo");

      if (logo) {
        logo.src = selectedLogo;
      }
    };

    reader.readAsDataURL(file);
  });
}

/* =========================
   SAVE LOGO
========================= */

function saveLogo() {
  if (!selectedLogo) {
    showToast("⚠ Select logo first", "error");

    return;
  }

  /* SAVE LOCAL */

  localStorage.setItem("kivustream_logo", selectedLogo);

  /* UPDATE WEBSITE */

  document.querySelectorAll(".site-logo").forEach((img) => {
    img.src = selectedLogo;
  });

  showToast("✅ Logo Updated");
}

/* =========================
   LOAD SAVED LOGO
========================= */

window.addEventListener("DOMContentLoaded", () => {
  const savedLogo = localStorage.getItem("kivustream_logo");

  if (savedLogo) {
    /* ADMIN PREVIEW */

    const adminLogo = document.getElementById("site-logo");

    if (adminLogo) {
      adminLogo.src = savedLogo;
    }

    /* WEBSITE LOGOS */

    document.querySelectorAll(".site-logo").forEach((img) => {
      img.src = savedLogo;
    });
  }
});

/* =========================
   ADMIN SECTION SWITCHER
========================= */

function showAdminSection(
  id,
  event
) {
  document
    .querySelectorAll(".admin-section")
    .forEach(section =>
      section.classList.remove(
        "active-section"
      )
    );

  document
    .querySelectorAll(".admin-tab")
    .forEach(tab =>
      tab.classList.remove(
        "active"
      )
    );

  document
    .getElementById(id)
    .classList.add(
      "active-section"
    );

  if (event) {
    event.target.classList.add(
      "active"
    );
  }
}

/* =========================
   LIVE IMAGE PREVIEW
========================= */

function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);

  const preview = document.getElementById(previewId);

  if (!input || !preview) return;

  input.addEventListener("input", () => {
    const url = input.value.trim();

    if (url) {
      preview.src = url;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });
}

/* AUTO INIT */

document.addEventListener("DOMContentLoaded", () => {
  setupImagePreview("movie-image-url", "poster-preview");

  setupImagePreview("movie-banner-url", "banner-preview");
});

/* =========================
   PAGINATION ENGINE
========================= */

const HOMEPAGE_LIMIT = 6;

const sectionPages = {};
const sectionData = {};
/* =========================
   PAGINATED RENDER
========================= */

function renderPaginatedRow(id, items) {

  const container = $(id);

  if (!container) return;

  container.innerHTML = "";

  /* ONLY SHOW 6 */
  const latest =
    items.slice(0, HOMEPAGE_LIMIT);

  latest.forEach((movie) => {
    container.appendChild(
      createMovieCard(movie)
    );
  });

  /* VIEW ALL BUTTON */

  if (
    items.length >
    HOMEPAGE_LIMIT
  ) {

    const btn =
      document.createElement(
        "button"
      );

    btn.className =
      "view-all-btn";

    btn.innerHTML =
      "View All →";

    btn.onclick =
      () => {

        localStorage.setItem(
          "viewAllData",
          JSON.stringify(items)
        );

        window.location.href =
          "viewall.html";
      };

    container.appendChild(
      btn
    );
  }
}
/* =========================
   PAGINATION BUTTONS
========================= */

function renderPagination(id, totalItems) {
  const container = $(id);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return;

  const pagination = document.createElement("div");

  pagination.className = "pagination";

  pagination.innerHTML += `

    <button
      onclick="changePage('${id}', -1)">

      ◀ Prev

    </button>

  `;

  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `

      <button
        class="${sectionPages[id] === i ? "active-page" : ""}"
        onclick="goToPage('${id}', ${i})">

        ${i}

      </button>

    `;
  }

  pagination.innerHTML += `

    <button
      onclick="changePage('${id}', 1)">

      Next ▶

    </button>

  `;

  container.appendChild(pagination);
}

/* =========================
   CHANGE PAGE
========================= */

function changePage(id, dir) {

  const items =
    sectionData[id] || [];

  const totalPages =
    Math.ceil(
      items.length /
      ITEMS_PER_PAGE
    );

  sectionPages[id] += dir;

  if (sectionPages[id] < 1) {
    sectionPages[id] = 1;
  }

  if (
    sectionPages[id] >
    totalPages
  ) {
    sectionPages[id] =
      totalPages;
  }

  renderAll(allMovies);
}
/* =========================
   GO TO PAGE
========================= */

function goToPage(id, page) {
  sectionPages[id] = page;

  renderAll(allMovies);
}
/* =========================
   VIEW ALL SYSTEM
========================= */

function openSection(
type
){

let filtered=[];

/* RECENT */

if(
type==="recent"
){

filtered=
allMovies
.slice();

}

/* MOVIES */

else if(
type==="movie"
){

filtered=
allMovies.filter(
m=>
m.type==="movie"
);

}

/* SERIES */

else if(
type==="series"
){

filtered=
allMovies.filter(
m=>
m.type==="series"
);

}

/* RECOMMENDED */

else if(
type==="recommended"
){

filtered=
allMovies.slice(
0,
30
);

}

/* CONTINUE */

else if(
type==="continue"
){

filtered=
JSON.parse(
localStorage.getItem(
"continueWatching"
)
)||[];

}

/* CATEGORY */

else{

filtered=
allMovies.filter(
m=>
m.category===
type
);

}

localStorage.setItem(
"viewAllData",

JSON.stringify(
filtered
)
);

window.location.href=
"./viewall.html";

}
/* =========================
   FULL PAGE MOVIE LOADER
========================= */

async function loadMoviePage() {
  const params = new URLSearchParams(window.location.search);

  const id = params.get("id");

  if (!id) return;

  let { data: movie, error } = await supabaseClient
  .from("movies")
  .select("*")
  .eq("id", id)
  .single();

if (error || !movie) {
  console.log(error);
  return;
}

const tmdbMovie = await cachedTMDB(movie.id, movie.title);

movie = {
  ...movie,
  ...tmdbMovie
};

  currentMovie = movie;
const poster =
document.getElementById(
"movie-poster"
);

if (poster) {
  poster.src =
    movie.poster ||
    movie.image ||
    "./logo.png";
}
  /* TITLE */

  $("movie-title").innerText = movie.title;

  /* DESCRIPTION */

 $("movie-description").innerText =
  movie.overview ||
  movie.description ||
  "";

  /* CATEGORY */

  $("movie-category").innerText = movie.category || "Movie";

  /* TRANSLATOR */

  $("movie-translator").innerText = movie.translator || "KivuStream";

  /* BANNER */
$("movie-banner").style.backgroundImage = `
linear-gradient(
  to top,
  rgba(0,0,0,.95),
  rgba(0,0,0,.3)
),
url(${movie.banner || movie.poster || movie.image || './logo.png'})
`;

  /* WATCH */

  $("watch-btn").onclick = () => {
    const player = $("player");

    player.src = movie.video;

    player.play();

    player.scrollIntoView({
      behavior: "smooth"
    });
  };

  /* DOWNLOAD */

  $("download-btn").onclick = () => {
    if (movie.download) {
      window.open(movie.download, "_blank");
    }
  };

  /* LOAD COMMENTS */

  loadComments(movie.id);

  /* LOAD EPISODES */

  if (movie.type === "series") {
    loadEpisodes(movie.id);
  }
}

/* AUTO LOAD PAGE */

if (window.location.pathname.includes("watch.html")) {
  loadMoviePage();
}

/* =========================
   UPLOAD TO SUPABASE
========================= */

async function uploadImageToSupabase(file, bucket) {
  if (!file) return null;

  const fileName = `${bucket}/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    console.error(error);

    showToast("❌ Upload failed");

    return null;
  }

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(fileName);

  return data.publicUrl;
}

async function loadSeriesDropdown() {
  const { data, error } = await supabaseClient
    .from("series")
    .select("*")
    .order("title");

  if (error) {
    console.log(error);
    return;
  }

  const select = document.getElementById("series-id");
  if (!select) return;

  let options = `
    <option value="">
      Select Series
    </option>
  `;

  data.forEach((series) => {
    options += `
      <option value="${series.id}">
        ${series.title}
      </option>
    `;
  });

  select.innerHTML = options;
}

async function loadSeriesEpisodes() {
  const seriesId = document.getElementById("series-id").value;

  if (!seriesId) return;

  const { data, error } = await supabaseClient
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId)
    .order("season", {
      ascending: true
    })
    .order("episode", {
      ascending: true
    });

  if (error) {
    console.log(error);
    return;
  }

  const container = document.getElementById("admin-episodes-list");

  container.innerHTML = data
    .map(
      (ep) => `

      <div class="episode-card">

        <strong>
          S${ep.season} EP${ep.episode}
        </strong>

        <br>

        ${ep.title}

      </div>

    `
    )
    .join("");
}

/* =========================
   CREATE SERIES
========================= */

async function createSeries(){

try{

const title =
document
.getElementById(
"series-title"
)
.value
.trim();

const description =
document
.getElementById(
"series-description"
)
.value
.trim();

const image =
document
.getElementById(
"series-image"
)
.value
.trim();

const banner =
document
.getElementById(
"series-banner"
)
.value
.trim();

const category =
document
.getElementById(
"series-category"
)
.value;

if(
!title
){

alert(
"Enter series title"
);

return;

}

const {

data,

error

}

=

await supabaseClient

.from(
"series"
)

.insert([
{

title,

description,

image,

banner,

category

}
])

.select();

if(
error
){

console.log(
error
);

alert(
error.message
);

return;

}

alert(
"Series Created ✔"
);

/* refresh website */

if(
typeof loadSeries
===
"function"
)
await loadSeries();

if(
typeof loadMovies
===
"function"
)
await loadMovies();

if(
typeof loadHero
===
"function"
)
await loadHero();

if(
typeof loadSeriesDropdown
===
"function"
)
await loadSeriesDropdown();

/* clear inputs */

document
.getElementById(
"series-title"
)
.value="";

document
.getElementById(
"series-description"
)
.value="";

document
.getElementById(
"series-image"
)
.value="";

document
.getElementById(
"series-banner"
)
.value="";

}
catch(err){

console.log(
err
);

alert(
"Failed creating series ❌"
);

}

}
window.createSeries = async function () {
  const title = document.getElementById("series-title").value;

  const description = document.getElementById("series-description").value;

  const image = document.getElementById("series-image").value;

  const banner = document.getElementById("series-banner").value;

  const category = document.getElementById("series-category").value;

  if (!title) {
    alert("Series title required");

    return;
  }

  const { error } = await supabaseClient.from("series").insert([
    {
      title,
      description,
      image,
      banner,
      category
    }
  ]);

  if (error) {
    console.log(error);

    alert(error.message);

    return;
  }

  alert("✅ Series Created");

  loadSeriesDropdown();
};

setTimeout(() => {
  const loader = document.getElementById("loader");

  if (loader) {
    loader.style.display = "none";
  }
}, 5000);

async function loadEpisodesCount() {
  const { data } =
    await supabaseClient
      .from("episodes")
      .select("id");

  const el = document.getElementById(
    "episodes-count"
  );

  if (el) {
    el.innerText =
      (data || []).length;
  }
}

window.addEventListener(
  "load",
  () => {

    const loader =
      document.getElementById(
        "loader"
      );

    if(loader){

      loader.style.display =
        "none";
    }

    document.body.style.visibility =
      "visible";
  }
);

setTimeout(() => {

  const loader =
    document.getElementById(
      "loader"
    );

  if(loader){

    loader.remove();
  }

  document.body.style.visibility =
    "visible";

},10000);
