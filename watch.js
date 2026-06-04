const params =
new URLSearchParams(
  window.location.search
);

const id =
params.get("id");

console.log("Movie ID:", id);

const supabaseUrl = "https://exjgejujfxejjlbfizgz.supabase.co";

const supabaseKey =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amdlanVqZnhlampsYmZpemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQzMTQsImV4cCI6MjA5NDA5MDMxNH0.CWUYLp4qJfriIYXWScB7wcHHVTCuz0SGDhWUV3tMR1Y";
console.log("Supabase loaded:", window.supabase);
const supabaseClient =
window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);
let currentMovie = null;
let allEpisodes = [];

/* ---------------------------
   INIT
----------------------------*/
document.addEventListener("DOMContentLoaded", loadMovie);

/* ---------------------------
   LOAD MOVIE
----------------------------*/
async function loadMovie() {

const id =
new URLSearchParams(
window.location.search
).get("id");

console.log("Movie ID:", id);

if(!id){
console.error("No ID");
return;
}

try{

const { data,error } =
await supabaseClient
.from("movies")
.select("*")
.eq("id",id)
.single();

console.log("DATA:",data);
console.log("ERROR:",error);

if(error){
throw error;
}

if(!data){
alert("Movie not found");
return;
}

currentMovie=data;

renderMovie();

}catch(err){

console.error(err);

alert(
"Movie failed to load"
);

}

}
/* ---------------------------
   RENDER MOVIE
----------------------------*/
function renderMovie() {

  const movie = currentMovie;
  if (!movie) return;

  document.title = movie.title;

  setText(
"movie-title",
movie.title || "Unknown Movie"
);

setText(
"movie-description",
movie.description ||
"No description"
);
 document.getElementById("movie-category").innerHTML =
  `🎭 ${movie.category || "Entertainment"}`;

 document.getElementById("movie-translator").innerHTML =
  `🎙 ${movie.translator || "KivuStream"}`;

 setAttr(
"movie-poster",
"src",
movie.image || "./logo.png"
);
  const backdrop = document.querySelector(".hero-backdrop");

if (backdrop) {
  backdrop.style.backgroundImage =
    `url(${movie.banner || movie.image})`;
}
  document.body.style.setProperty(
"--movie-bg",
`url(${movie.banner || movie.image})`
);
document.getElementById("movie-type").innerHTML =
  movie.type === "series"
    ? "📺 Series"
    : "🎬 Movie";
  document.getElementById("movie-status").innerHTML =
  movie.status || "🔥 Trending";

  /* PLAY BUTTON */
  const watchBtn = document.getElementById("watch-btn");
  if (watchBtn) {
  watchBtn.onclick = () => {

    const player =
      document.getElementById("player");

    player.src = movie.video;

    player.scrollIntoView({
      behavior: "smooth"
    });

    player.play();

  };
}
  /* DOWNLOAD */
  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      window.open(movie.download, "_blank");
    };
  }

  /* SERIES OR MOVIE */
  if (movie.type === "series") {
    loadSeriesEpisodes(movie.id);
  } else {
    const section = document.getElementById("series-section");
    if (section) section.style.display = "none";
  }
  
  document.getElementById("comment-btn").onclick = () => {
  postComment(currentMovie.id);
};

loadComments(currentMovie.id);

  loadRecommended();
}
/* ---------------------------
   LOAD EPISODES
----------------------------*/
async function loadSeriesEpisodes(seriesId) {

  const { data, error } = await supabaseClient
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId)
    .order("season");

  if (error || !data) {
    console.error("Episode error:", error);
    return;
  }

  allEpisodes = data;

  const seasons = [...new Set(data.map(e => e.season))];

  const seasonButtons = document.getElementById("season-buttons");
  if (!seasonButtons) return;

  seasonButtons.innerHTML = "";

  seasons.forEach(season => {
    const btn = document.createElement("button");
    btn.textContent = `Season ${season}`;
    btn.onclick = () => showSeason(season);
    seasonButtons.appendChild(btn);
  });

 showSeason(seasons[0]);

if (data.length > 0) {
  playEpisode(data[0].video);
}

}

/* ---------------------------
   SHOW SEASON
----------------------------*/
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

   <span class="episode-number">
      EP ${ep.episode}
   </span>

   <div>

      <h3>${ep.title}</h3>

      <small>
        Season ${ep.season}
      </small>

   </div>

</div>

<div class="episode-actions">

   <button class="watch-ep">
      ▶ Watch
   </button>

   <button class="download-ep">
      ⬇
   </button>

</div>

`;

    card.querySelector(".watch-ep").onclick = () => playEpisode(ep.video);
    card.querySelector(".download-ep").onclick = () => window.open(ep.download);

    container.appendChild(card);
  });
}

/* ---------------------------
   PLAY EPISODE
----------------------------*/
function playEpisode(video) {

  const player = document.getElementById("player");

  player.src = video;
  player.play();

  player.scrollIntoView({ behavior: "smooth" });
}

/* ---------------------------
   RECOMMENDED
----------------------------*/
async function loadRecommended() {

  const { data } = await supabaseClient
    .from("movies")
    .select("*")
    .limit(12);

  const container = document.getElementById("recommended-container");
  if (!container || !data) return;

  container.innerHTML = "";

(data || []).forEach(movie => {

    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <img src="${movie.image}" />
      <h3>${movie.title}</h3>
    `;

    card.onclick = () => openMovie(movie.id);

    container.appendChild(card);
  });
}

/* ---------------------------
   NAVIGATION
----------------------------*/
function openMovie(id) {
  window.location.href = `watch.html?id=${id}`;
}

/* ---------------------------
   HELPERS
----------------------------*/
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value || "";
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}

async function loadComments(movieId){

  const { data } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("movie_id", movieId)
    .order("created_at", { ascending:false });

  const container = document.getElementById("comments-container");
  if(!container) return;

  container.innerHTML = "";

  data.forEach(c => {

    container.innerHTML += `
      <div class="comment">
        <strong>${c.username || "User"}</strong>
        <p>${c.text}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      </div>
    `;
  });
}

/* ---------------------------
   POST COMMENT (PRO VERSION)
----------------------------*/
async function postComment(movieId) {

  const commentInput =
    document.getElementById("comment-input");

  const usernameInput =
    document.getElementById("username-input");

  const username =
    usernameInput?.value.trim() || "Guest";

  const comment =
    commentInput?.value.trim();

  if (!comment) {
    alert("Please write a comment.");
    return;
  }

  const btn =
    document.getElementById("comment-btn");

  btn.disabled = true;
  btn.innerHTML = "⏳ Posting...";

  try {

    const { error } = await supabaseClient
      .from("comments")
      .insert([
        {
          movie_id: movieId,
          username: username,
          text: comment
        }
      ]);

    if (error) throw error;

    commentInput.value = "";

    loadComments(movieId);

  } catch (err) {

    console.error(err);

    alert(
      "Failed to post comment."
    );

  } finally {

    btn.disabled = false;
    btn.innerHTML = "🚀 Post";

  }
}

  window.addEventListener("load",()=>{

const loader =
document.getElementById(
"loading-screen"
);

if(loader){
loader.remove();
}

});
