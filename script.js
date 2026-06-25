
const tmdbCache = new Map();
/* =========================
   TMDB API INTEGRATION
========================= */

const TMDB_API_KEY = "8b8937bf3e114fa3502358a4f090c0df";

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

 if (!res.ok) {
    console.error(
      "TMDB Error:",
      res.status
    );

    return {};
}

const data = await res.json();
  return data.results || [];
}
async function searchTMDBSeries(query) {

  const res = await fetch(
    `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );

if (!res.ok) {
    console.error(
      "TMDB Error:",
      res.status
    );

    return {};
}

const data = await res.json();

  return data.results || [];
}
async function getTMDBMovieDetails(id) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos`
  );

if (!res.ok) {
    console.error(
      "TMDB Error:",
      res.status
    );

    return {};
}

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
async function enrichMovieWithTMDB(item) {

  if (!item.title) return item;

  /* SERIES */
  if (item.type === "series") {

    const results =
      await searchTMDBSeries(item.title);

    if (!results.length) return item;

    const tmdb =
      await getTMDBSeriesDetails(results[0].id);

    return {

      ...item,

      poster:
        tmdb.poster || item.image,

      image:
        tmdb.poster || item.image,

      banner:
        tmdb.banner || item.banner,

      description:
        tmdb.overview || item.description,

      rating:
        tmdb.rating || item.rating,

      seasons:
        tmdb.seasons,

      episodesCount:
        tmdb.episodes,

      trailer:
        tmdb.trailer
    };
  }

  /* MOVIES */
  const results =
    await searchTMDBMovies(item.title);

  if (!results.length) return item;

  const tmdb =
    await getTMDBMovieDetails(results[0].id);

  return {

    ...item,

    poster:
      tmdb.poster || item.image,

    image:
      tmdb.poster || item.image,

    banner:
      tmdb.banner || item.banner,

    description:
      tmdb.overview || item.description,

    rating:
      tmdb.rating || item.rating,

    year:
      tmdb.release || item.year,

    trailer:
      tmdb.trailer
  };
}
async function cachedTMDB(item) {

  const key =
    `${item.type}-${item.title}`;

  if (tmdbCache.has(key)) {
    return tmdbCache.get(key);
  }

  const result =
    await enrichMovieWithTMDB(item);

  tmdbCache.set(key, result);

  return result;
}
async function getTMDBSeriesDetails(id) {
  const res = await fetch(
    `${TMDB_BASE}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos`
  );

if (!res.ok) {
    console.error(
      "TMDB Error:",
      res.status
    );

    return {};
}

const data = await res.json();
  return {
    title: data.name,
    overview: data.overview,
    poster: data.poster_path
      ? TMDB_POSTER + data.poster_path
      : null,

    banner: data.backdrop_path
      ? TMDB_BACKDROP + data.backdrop_path
      : null,

    rating: data.vote_average,
    release: data.first_air_date,
    seasons: data.number_of_seasons,
    episodes: data.number_of_episodes,
    trailer:
      data.videos?.results?.find(v => v.type === "Trailer")?.key || null
  };
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
   LOAD MOVIES + SMART RECENT
========================= */

async function loadMovies() {

  const [
    { data: movies, error: movieError },
    { data: series, error: seriesError }
  ] = await Promise.all([

    supabaseClient
      .from("movies")
      .select("*"),

    supabaseClient
      .from("series")
      .select("*")

  ]);

  if (movieError) {
    console.error(movieError);
  }

  if (seriesError) {
    console.error(seriesError);
  }

  /* SERIES FORMAT */

  const formattedSeries =
    (series || []).map(item => ({

      ...item,

      type: "series",

      category:
        item.category || "Series",

      image:
        item.image || item.poster,

      banner:
        item.banner || item.image,

      activity_date:

        item.last_activity_at ||

        item.updated_at ||

        item.created_at ||

        0

    }));


  /* MERGE + SORT */

  const combined = [

    ...(movies || []).map(item => ({
      ...item,

      activity_date:

        item.last_activity_at ||

        item.updated_at ||

        item.created_at ||

        0
    })),

    ...formattedSeries

  ].sort((a, b) => {

    return (
      new Date(b.activity_date)
      -
      new Date(a.activity_date)
    );

  });

/* TMDB ENRICH */

const enrichedMovies = await Promise.all(
  combined.map(async (item) => {
    try {

      if (item.type === "series") {

        const results = await searchTMDBSeries(item.title);

        if (!results || !results.length) {
          return item;
        }

        const tmdb = await getTMDBSeriesDetails(results[0].id);

        return {
          ...item,
          ...tmdb
        };
      }

      return await cachedTMDB(item);

    } catch (err) {

      console.error("TMDB ERROR:", err);

      return item;
    }
  })
);

console.log(
  "SORTED RECENT:",
  enrichedMovies.map(x => ({
    title: x.title,
    activity: x.activity_date
  }))
);
/* =========================
ATTACH LATEST EPISODES
========================= */

const latestMap =
await getLatestEpisodesMap();

const finalMovies =
enrichedMovies.map(
item=>{

if(
item.type!=="series"
){

return item;

}

const latest =
latestMap[
item.id
];

return{

...item,

latestSeason:
latest?.season ||

null,

latestEpisode:
latest?.episode ||

null

};

}
);


/* SAVE */

allMovies =
finalMovies;

window.allMovies =
finalMovies;


/* RENDER */

renderAll(
finalMovies
);


/* HERO */

initHero(
finalMovies
);


/* DEBUG */

console.log(
"SERIES WITH EP:",
finalMovies
.filter(
x=>
x.type==="series"
)
.map(
x=>({

title:
x.title,

season:
x.latestSeason,

episode:
x.latestEpisode

}))
);

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
function normalize(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase();
}

function renderAll(movies) {

  const safe = (movies || []).filter(Boolean);
   const sortedContent = [...safe].sort((a, b) => {

  const dateA = new Date(
    a.last_activity_at ||
    a.updated_at ||
    a.created_at ||
    0
  );

  const dateB = new Date(
    b.last_activity_at ||
    b.updated_at ||
    b.created_at ||
    0
  );

  return dateB - dateA;
});

  // RECENT (latest 10)
const latest =
[...safe]

.sort((a,b)=>{

const dateA=
new Date(

a.last_activity_at ||

a.updated_at ||

a.created_at ||

0

);

const dateB=
new Date(

b.last_activity_at ||

b.updated_at ||

b.created_at ||

0

);

return dateB-dateA;

});

renderPaginatedRow("recent-slider", latest.slice(0, 10));

  // MOVIES
  renderPaginatedRow(
    "movies-container",
    safe.filter(m => (m.type || "").toLowerCase() === "movie")
  );

  // SERIES (Latest Series section)
 renderPaginatedRow(
  "series-container",

  sortedContent.filter(m =>
    (m.type || "").toLowerCase() === "series"
  )
);

  // ACTION
  renderPaginatedRow(
    "action-container",
    safe.filter(m =>
      normalize(m.category) === "action"
    )
  );

  // INDIAN
  renderPaginatedRow(
    "indian-container",
    safe.filter(m =>
      normalize(m.category) === "indian"
    )
  );

  // HORROR
  renderPaginatedRow(
    "horror-container",
    safe.filter(m =>
      normalize(m.category) === "horror"
    )
  );

  // COMEDY
  renderPaginatedRow(
    "comedy-container",
    safe.filter(m =>
      normalize(m.category) === "comedy"
    )
  );

  // ROMANCE
  renderPaginatedRow(
    "romance-container",
    safe.filter(m =>
      normalize(m.category) === "romance"
    )
  );

  // DRAMA
  renderPaginatedRow(
    "drama-container",
    safe.filter(m =>
      normalize(m.category) === "drama"
    )
  );

  // CRIME
  renderPaginatedRow(
    "crime-container",
    safe.filter(m =>
      normalize(m.category) === "crime"
    )
  );

  // SCI-FI
  renderPaginatedRow(
    "scifi-container",
    safe.filter(m =>
      normalize(m.category) === "sci-fi"
    )
  );

  // HIGHSCHOOL
  renderPaginatedRow(
    "highschool-container",
    safe.filter(m =>
      normalize(m.category) === "highschool"
    )
  );

  // ANIMATION
  renderPaginatedRow(
    "animation-container",
    safe.filter(m =>
      normalize(m.category) === "animation"
    )
  );

  // TV SERIES (IMPORTANT FIX)
  renderPaginatedRow(
    "tvseries-container",
    safe.filter(m =>
      (m.type || "").toLowerCase() === "series" ||
      normalize(m.category) === "tv series"
    )
  );

  // OTHER MOVIES
  renderPaginatedRow(
    "othermovies-container",
    safe.filter(m =>
      normalize(m.category) === "other movies"
    )
  );
function loadRecommendations(allContent) {

    const lastCategory =
        localStorage.getItem("lastCategory");

    const lastMovieId =
        localStorage.getItem("lastMovieId");

    let recommendations =
        allContent.filter(movie =>
            movie.category === lastCategory &&
            movie.id != lastMovieId
        );

    recommendations.sort((a,b)=>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    renderPaginatedRow(
        "updates-container",
        recommendations.slice(0,15)
    );
}
   loadRecommendations(sortedContent);
  // CONTINUE WATCHING
  const continueWatching =
    JSON.parse(localStorage.getItem("continueWatching")) || [];

  renderPaginatedRow(
    "continue-container",
    continueWatching
  );
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

function createMovieCard(movie){

const card =
document.createElement("div");

card.className =
"movie-card";

card.onclick =
() => openMovie(movie.id);

card.innerHTML = `

<div class="
movie-badge
${movie.type === "series" ? "series" : ""}
">

${movie.type === "series" ? "SERIES" : "MOVIE"}

</div>

<div class="translator-badge">

🛡

${movie.translator || "KivuStream"}

</div>

<img
src="${
movie.poster ||
movie.image ||
'./logo.png'
}"
loading="lazy"
>

<div class="movie-info">

<h3>

${movie.title}

</h3>

${
movie.latestEpisode
?

`
<div class="episode-meta">

🔥 S${movie.latestSeason}

EP${movie.latestEpisode}

</div>
`

:

""

}

<div class="movie-meta">

<span>

⭐ ${movie.rating || "8.5"}

</span>

<span>

${movie.category || "Drama"}

</span>

</div>

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

  if (!Array.isArray(movies) || movies.length === 0) {
    console.log("No movies found for hero slider");
    return;
  }

  heroMovies = [...movies]
    .sort((a, b) => {
      return new Date(b.created_at || 0) -
             new Date(a.created_at || 0);
    })
    .slice(0, 10);

  heroIndex = 0;
  currentHero = heroMovies[0];

  showHero(heroIndex);

  clearInterval(heroInterval);

heroInterval = setInterval(() => {
    nextHero();
},18000);
}

function renderHero() {

  const hero =
    document.getElementById("hero-slider");

  if (!hero || !currentHero) return;

  hero.style.backgroundImage = `
    linear-gradient(
      to right,
      rgba(0,0,0,.85),
      rgba(0,0,0,.2)
    ),
    url(${
      currentHero.banner ||
      currentHero.poster ||
      currentHero.image ||
      "assets/fallback.jpg"
    })
  `;

  const title =
    document.getElementById("hero-title");

  const description =
    document.getElementById(
      "hero-description"
    );

  const badge =
    document.getElementById(
      "hero-badge"
    );

  if (title) {
    title.textContent =
      currentHero.title || "Untitled";
  }

  if (description) {
    description.textContent =
      currentHero.description || "";
  }

  if (badge) {

    const recentDays = Math.floor(
      (
        Date.now() -
        new Date(
          currentHero.last_activity_at ||
          currentHero.created_at
        )
      ) / 86400000
    );

    if (
      currentHero.type === "series" &&
      recentDays <= 10
    ) {
      badge.textContent =
        "🔥 NEW EPISODE";

      badge.style.display =
        "inline-block";
    } else {
      badge.style.display =
        "none";
    }
  }
}

function nextHero() {

  if (heroMovies.length === 0) return;

  heroIndex++;

  if (heroIndex >= heroMovies.length) {
    heroIndex = 0;
  }

  currentHero = heroMovies[heroIndex];

  showHero(heroIndex);
}

function prevHero() {

  if (heroMovies.length === 0) return;

  heroIndex--;

  if (heroIndex < 0) {
    heroIndex = heroMovies.length - 1;
  }

  currentHero = heroMovies[heroIndex];

  showHero(heroIndex);
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

  if (!id) return;

  window.location.href =
    `watch.html?id=${id}`;
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
        <div class="comment">
          ${c.comment}
        </div>
      `
    )
    .join("");
}

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
  UPLOAD MOVIE PRO
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
await supabaseClient
.from("series")
.update({
  last_activity_at: new Date(),
  featured_until:
    new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    )
})
.eq("id", series_id);
     
    // 1. insert episode
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

    // 2. IMPORTANT: update series activity (THIS IS WHAT YOU ARE MISSING)
   /* UPDATE SERIES ACTIVITY */

await supabaseClient
.from("series")
.update({

  last_activity_at:
    new Date().toISOString(),

  latest_episode:
    episode_number,

  latest_season:
    season_id

})
.eq("id", series_id);

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
/* =========================
     RENDER SEASON
========================= */
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
/* =========================
   RENDER EPISODES
========================= */
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

const HOMEPAGE_LIMIT = 7;

const sectionPages = {};
const sectionData = {};
function renderPaginatedRow(id, items) {

  const container = $(id);

  if (!container) return;

  container.innerHTML = "";

  const latest =
    items.slice(0, HOMEPAGE_LIMIT);

  latest.forEach((movie) => {
    container.appendChild(
      createMovieCard(movie)
    );
  });

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

const tmdbMovie = await cachedTMDB(movie);

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
/* =========================
 LOAD SERIES EPISODES
========================= */
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

if (typeof loadSeries === "function") {
  await loadSeries();
}

if (typeof loadMovies === "function") {
  await loadMovies();
}

if (typeof loadHero === "function") {
  await loadHero();
}

if (typeof loadSeriesDropdown === "function") {
  await loadSeriesDropdown();
}

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
  try {
    const title = document.getElementById("series-title").value;
    const description = document.getElementById("series-description").value;
    const category = document.getElementById("series-category").value;

    const imageFile = document.getElementById("series-image-file").files[0];
    const bannerFile = document.getElementById("series-banner-file").files[0];

    if (!title) {
      alert("Series title required");
      return;
    }

    let imageUrl = "";
    let bannerUrl = "";

    if (imageFile) {
      imageUrl = await uploadImageToSupabase(imageFile, "series");
    }

    if (bannerFile) {
      bannerUrl = await uploadImageToSupabase(bannerFile, "series");
    }

    const { error } = await supabaseClient.from("series").insert([
      {
        title,
        description,
        category,
        image: imageUrl,
        banner: bannerUrl
      }
    ]);

    if (error) {
      console.log(error);
      alert(error.message);
      return;
    }

    alert("✅ Series Created");

    loadSeriesDropdown();
    loadMovies(); // refresh UI automatically
     loadSeries();
  } catch (err) {
    console.error(err);
    alert("Failed creating series ❌");
  }
};
/* =========================
   LOAD EPISODES COUNT
========================= */
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
   /* =========================
   LOAD SERIES
========================= */
async function loadSeries() {

  // 1. get series
  const { data: series } = await supabaseClient
    .from("series")
    .select("*")
    .order("last_activity_at", { ascending: false });

  const container =
    document.getElementById("series-container");

  if (!container || !series) return;

  container.innerHTML =
    "<div class='loading'>Loading Series...</div>";

  // 2. get latest episodes map (YOU ALREADY HAVE THIS FUNCTION)
  const latestMap = await getLatestEpisodesMap();

  // 3. enrich series with TMDB + episode info
  const enriched = await Promise.all(
    series.map(async (s) => {

      const tmdb = await enrichMovieWithTMDB({
        ...s,
        type: "series"
      });

      const latest = latestMap[s.id];

      return {
        ...tmdb,
        latestSeason: latest?.season,
        latestEpisode: latest?.episode
      };
    })
  );

  // 4. render UI (UPDATED CARD)
  container.innerHTML = enriched.map(s => `

    <div class="movie-card"
         onclick="window.location.href='watch.html?id=${s.id}'">

      <img
        src="${s.poster || s.image || './logo.png'}"
        alt="${s.title}"
        loading="lazy"
      >

      <div class="movie-info">

        <h3>${s.title}</h3>

        <p class="rating">
          ⭐ ${s.rating ? Number(s.rating).toFixed(1) : "N/A"}
        </p>

        <!-- 🔥 NEW: Latest Episode Display -->
        <p class="episode-tag">
          ${s.latestEpisode
            ? `🔥 S${s.latestSeason} EP${s.latestEpisode}`
            : "No episodes yet"}
        </p>

      </div>

    </div>

  `).join("");
}
/* =========================
   GET LATEST EPISODE
========================= */
async function getLatestEpisodesMap() {

  const { data, error } = await supabaseClient
    .from("episodes")
    .select(`
series_id,
season,
episode
`)
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return {};
  }

  const map = {};

  for (const ep of data || []) {

    // first one per series = latest (because sorted DESC)
    if (!map[ep.series_id]) {
      map[ep.series_id] = {
       season: ep.season,
episode: ep.episode
      };
    }
  }

  return map;
}


/* =========================
   PERFORMANCE BOOST
   ADD BELOW EXISTING CODE
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* Remove loader quickly */

    setTimeout(() => {

      const loader =
        document.getElementById(
          "loader"
        );

      if (loader) {
        loader.style.display =
          "none";
      }

    }, 800);

    /* Preload hero image */

    setTimeout(() => {

      if (
        typeof currentHero !==
        "undefined" &&
        currentHero
      ) {

        const img =
          new Image();

        img.src =
          currentHero.banner ||
          currentHero.poster ||
          currentHero.image;

      }

    }, 100);

    /* Lazy load images */

    document
      .querySelectorAll("img")
      .forEach((img) => {

        img.loading =
          "lazy";

        img.decoding =
          "async";

      });

    /* Prevent heavy reflow */

    requestAnimationFrame(() => {

      document.body.style.opacity =
        "1";

    });

  }
);

/* Faster scrolling */
window.addEventListener(
  "load",
  () => {

    document.body.style.visibility =
      "visible";

  }
);

/* Disable expensive resize events */

let resizeTimeout;

window.addEventListener(
  "resize",
  () => {

    clearTimeout(
      resizeTimeout
    );

    resizeTimeout =
      setTimeout(
        () => {},
        300
      );

  }
);
/* =========================================
   HERO TRAILER SYSTEM PRO
========================================= */

const trailerCache = new Map();

/* =========================================
   GET TRAILER
========================================= */

async function getTrailer(title, type = "movie") {

  try {

    if (!title) return null;

    const cacheKey = `${title}-${type}`;

    // Use cache first
    if (trailerCache.has(cacheKey)) {
      return trailerCache.get(cacheKey);
    }

    const endpoint =
      type === "series" || type === "tv"
        ? "tv"
        : "movie";

    // Search movie/series
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/${endpoint}` +
      `?api_key=${TMDB_API_KEY}` +
      `&query=${encodeURIComponent(title)}`
    );

    if (!searchRes.ok)
      throw new Error("TMDB search failed");

    const searchData = await searchRes.json();

    if (!searchData.results?.length)
      return null;

    const item = searchData.results[0];

    // Get videos
    const videosRes = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${item.id}/videos` +
      `?api_key=${TMDB_API_KEY}`
    );

    if (!videosRes.ok)
      throw new Error("Video request failed");

    const videosData = await videosRes.json();

    // Official trailer first
    let trailer = videosData.results.find(video =>
      video.site === "YouTube" &&
      video.type === "Trailer" &&
      video.official
    );

    // Any trailer fallback
    if (!trailer) {

      trailer = videosData.results.find(video =>
        video.site === "YouTube" &&
        video.type === "Trailer"
      );

    }

    // Teaser fallback
    if (!trailer) {

      trailer = videosData.results.find(video =>
        video.site === "YouTube"
      );

    }

    if (!trailer) return null;

    const url =
      `https://www.youtube.com/embed/${trailer.key}`;

    trailerCache.set(cacheKey, url);

    return url;

  } catch (err) {

    console.error("getTrailer Error:", err);

    return null;
  }
}
async function loadHeroTrailer(movie) {

  const iframe =
    document.getElementById("heroTrailer");

  const heroVideo =
    document.querySelector(".hero-video");

  if (!iframe || !heroVideo || !movie) return;

  try {

    heroVideo.classList.remove("show");
    iframe.src = "";

    const trailer = await getTrailer(
      movie.title || movie.name,
      movie.type
    );

    if (!trailer) return;

    const trailerId =
      trailer.match(/embed\/([^?]+)/)?.[1];

    iframe.src =
      `${trailer}` +
      `?autoplay=1` +
      `&mute=1` +
      `&controls=0` +
      `&loop=1` +
      `&playlist=${trailerId}` +
      `&modestbranding=1` +
      `&rel=0` +
      `&playsinline=1` +
      `&enablejsapi=1`;

    heroVideo.classList.add("show");

  } catch (err) {

    console.error(
      "Trailer Load Error:",
      err
    );

    iframe.src = "";
    heroVideo.classList.remove("show");
  }
}
async function showHero(index) {

  if (!heroMovies?.length) return;

  if (index >= heroMovies.length)
    index = 0;

  if (index < 0)
    index = heroMovies.length - 1;

  const movie = heroMovies[index];

  if (!movie) return;

  currentHero = movie;

  document.getElementById("hero-title").textContent =
    movie.title || movie.name || "Untitled";

  document.getElementById("hero-description").textContent =
    movie.description ||
    movie.overview ||
    "Watch now on KivuStream.";

  const heroSlider =
    document.getElementById("hero-slider");

  heroSlider.style.backgroundImage = `
    linear-gradient(
      to right,
      rgba(0,0,0,.88),
      rgba(0,0,0,.35)
    ),
    url('${
      movie.banner ||
      movie.backdrop ||
      movie.poster ||
      movie.image ||
      ""
    }')
  `;

  heroSlider.style.backgroundSize = "cover";
  heroSlider.style.backgroundPosition = "center";

  await loadHeroTrailer(movie);
}
