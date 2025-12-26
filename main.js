const libraryEl = document.getElementById("library");
const sortScoreBtn = document.getElementById("sortScore");
const sortNameBtn = document.getElementById("sortName");

// PSN-Profil
const psnInput = document.getElementById("psn");
const savePsn = document.getElementById("savePsn");
const psnInfo = document.getElementById("psnInfo");

let psnName = localStorage.getItem("psnName");
if (psnName) showPsn(psnName);

savePsn.onclick = () => {
  const name = psnInput.value.trim();
  if (!name) return;
  localStorage.setItem("psnName", name);
  showPsn(name);
};

function showPsn(name) {
  psnInfo.innerHTML = `Bibliothek von <a href="https://psnprofiles.com/${name}" target="_blank">${name}</a>`;
}

// Spielebibliothek
let games = JSON.parse(localStorage.getItem("games")) || [];

document.getElementById("addGame").onclick = () => {
  const name = document.getElementById("gameName").value.trim();
  if (!name) return;

  const values = [
    document.getElementById("story").value,
    document.getElementById("characters").value,
    document.getElementById("gameplay").value,
    document.getElementById("art").value,
    document.getElementById("sound").value,
    document.getElementById("twist").value,
    document.getElementById("overall").value
  ].map(Number);

  if (values.some(v => v < 1 || v > 10 || Number.isNaN(v))) return;

  const score = (values.reduce((a,b) => a + b, 0) / values.length).toFixed(2);

  const game = {
    name,
    platform: document.getElementById("platform").value,
    status: document.getElementById("status").value,
    score
  };

  games.push(game);
  localStorage.setItem("games", JSON.stringify(games));
  render();
};

function render(sortBy = "score") {
  libraryEl.innerHTML = "";
  let sortedGames = [...games];

  if (sortBy === "score") sortedGames.sort((a,b) => b.score - a.score);
  if (sortBy === "name") sortedGames.sort((a,b) => a.name.localeCompare(b.name));

  sortedGames.forEach((g,i) => {
    const li = document.createElement("li");
    li.className = "game-card";
    li.innerHTML = `
      <strong>${i+1}. ${g.name}</strong> (${g.platform})<br>
      Status: ${g.status} | Score: ${g.score}/10
      <div class="score-bar" style="width:${g.score*10}%; background:#1db954;"></div>
    `;
    libraryEl.appendChild(li);
  });
}

render();

// Sortier-Buttons
if (sortScoreBtn) sortScoreBtn.onclick = () => render("score");
if (sortNameBtn) sortNameBtn.onclick = () => render("name");
