const libraryEl = document.getElementById("library");
// Suggestions source: try to load local catalog `data/games_catalog.json`, fallback to in-memory list
let gamesCatalog = null;
const gamesDB = [
  "The Last of Us",
  "The Last of Us Part II",
  "God of War",
  "Uncharted",
  "Horizon Zero Dawn",
  "Elden Ring",
  "The Legend of Zelda: Breath of the Wild",
  "Halo Infinite",
  "Call of Duty",
  "Final Fantasy VII",
  "Persona 5",
  "Resident Evil 2",
  "Resident Evil 4",
  "Dark Souls",
  "Bloodborne",
  "Cyberpunk 2077",
  "Spider-Man",
  "Spider-Man: Miles Morales",
  "Red Dead Redemption 2",
  "GTA V",
  "Sekiro",
  "Skyrim",
  "Fallout 4",
  "Mass Effect",
  "Doom Eternal",
  "Overwatch",
  "Minecraft",
  "Fortnite",
  "Among Us",
  "Stardew Valley",
  "Portal 2",
  "Half-Life 2",
  "Mario Kart 8",
  "Super Mario Odyssey",
  "Metroid Dread",
  "Animal Crossing",
  "Cuphead",
  "Dead Cells",
  "Celeste",
  "Ori and the Will of the Wisps",
  "Divinity: Original Sin 2",
  "Disco Elysium",
  "The Witcher 3",
  "Nier: Automata",
  "Shadow of the Colossus",
  "Sifu",
  "Returnal"
];

// Autocomplete UI state
let suggestionIndex = -1;
const suggestionsEl = document.getElementById('suggestions');
const gameNameInput = document.getElementById('gameName');

function clearSuggestions(){
  suggestionIndex = -1;
  if(suggestionsEl) suggestionsEl.innerHTML = '';
}

function selectSuggestion(name){
  if(gameNameInput) gameNameInput.value = name;
  clearSuggestions();
}

function showSuggestions(q){
  if(!suggestionsEl) return;
  const v = (q||'').trim().toLowerCase();
  if(!v){ clearSuggestions(); return; }
  const matches = gamesDB.filter(g => g.toLowerCase().includes(v)).slice(0,7);
  if(matches.length === 0){ clearSuggestions(); return; }
  suggestionsEl.innerHTML = '';
  matches.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.setAttribute('role','option');
    div.setAttribute('data-name', m);
    div.textContent = m;
    div.onclick = () => selectSuggestion(m);
    suggestionsEl.appendChild(div);
  });
}

// Try to load catalog file if present
fetch('/data/games_catalog.json').then(r=>{
  if(!r.ok) throw new Error('no catalog');
  return r.json();
}).then(arr=>{
  gamesCatalog = arr.map(g => ({ name: g.name, image: g.background_image || null }));
}).catch(()=>{
  // no catalog available locally
});

if(gameNameInput){
  gameNameInput.addEventListener('input', (e)=> showSuggestions(e.target.value));
  gameNameInput.addEventListener('keydown', (e)=>{
    const items = suggestionsEl ? Array.from(suggestionsEl.children) : [];
    if(e.key === 'ArrowDown'){
      suggestionIndex = Math.min(items.length-1, suggestionIndex+1);
      items.forEach((it,idx)=> it.setAttribute('aria-selected', idx===suggestionIndex));
      e.preventDefault();
    } else if(e.key === 'ArrowUp'){
      suggestionIndex = Math.max(0, suggestionIndex-1);
      items.forEach((it,idx)=> it.setAttribute('aria-selected', idx===suggestionIndex));
      e.preventDefault();
    } else if(e.key === 'Enter'){
      if(suggestionIndex >=0 && items[suggestionIndex]){
        selectSuggestion(items[suggestionIndex].dataset.name);
        e.preventDefault();
      }
    } else if(e.key === 'Escape'){
      clearSuggestions();
    }
  });
  document.addEventListener('click', (ev)=>{
    if(!ev.target.closest || !gameNameInput) return;
    if(ev.target !== gameNameInput && !ev.target.closest('#suggestions')) clearSuggestions();
  });
}
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

// PSNProfiles import
const importPsnBtn = document.getElementById('importPsn');
if(importPsnBtn){
  importPsnBtn.addEventListener('click', async ()=>{
    const name = psnInput.value.trim();
    if(!name){ alert('Bitte PSN-Name eingeben'); return; }
    importPsnBtn.disabled = true;
    importPsnBtn.textContent = 'Importiere...';
    try{
      const r = await fetch(`/api/psnprofiles/import?user=${encodeURIComponent(name)}`);
      const data = await r.json();
      if(!r.ok){ alert('Import fehlgeschlagen: '+(data.error||r.status)); return; }
      const found = data.games || [];
      if(found.length === 0){ alert('Keine Spiele gefunden oder Profil privat/leer.'); }
      // add each found game to local library with default score 0.00 and status 'Importiert'
      let added = 0;
      for(const item of found){
        const gname = (typeof item === 'string') ? item : (item.name || '');
        if(!gname) continue;
        // avoid duplicates by name
        if(games.some(x => x.name.toLowerCase() === gname.toLowerCase())) continue;
        const game = { name: gname, platform: 'PSN', status: 'Importiert', score: '0.00', image: (item.image || null) };

        // try to find a better image from local catalog
        try{
          if(window && window.fetch) {
            // use already-loaded gamesCatalog if available
            if(typeof gamesCatalog === 'object' && Array.isArray(gamesCatalog)){
              const match = gamesCatalog.find(c => c.name && c.name.toLowerCase() === gname.toLowerCase());
              if(match && match.image) game.image = match.image;
            }
          }
        }catch(e){
          // ignore catalog lookup errors
        }

        games.push(game);
        added++;
      }
      if(added>0){
        localStorage.setItem('games', JSON.stringify(games));
        render();
      }
      alert(`Import abgeschlossen. ${found.length} Spiele gefunden, ${added} hinzugefügt.`);
      // if any added, set background to last added game's image if available
      const last = games[games.length-1];
      if(last){
        if(last.image) {
          // set as body background directly
          const body = document.body;
          body.style.backgroundImage = `url('${last.image}')`;
        } else {
          setGameBackground(last.name);
        }
      }
    }catch(err){
      alert('Fehler beim Import: '+err.message);
    }finally{
      importPsnBtn.disabled = false;
      importPsnBtn.textContent = 'Import von PSNProfiles';
    }
  });
}

function showPsn(name) {
  psnInfo.innerHTML = `Bibliothek von <a href="https://psnprofiles.com/${name}" target="_blank">${name}</a>`;
}

// Spielebibliothek
let games = JSON.parse(localStorage.getItem("games")) || [];

// Background handling: start black, switch to game-specific image when a game is added
function setGameBackground(name){
  const body = document.body;
  if(!name){
    body.style.backgroundImage = '';
    return;
  }
  const query = encodeURIComponent(name + ' video game');
  const url = `https://source.unsplash.com/1600x900/?${query}`;
  // preload to avoid flicker
  const img = new Image();
  img.onload = () => {
    body.style.backgroundImage = `url('${img.src}')`;
  };
  img.onerror = () => {
    // fallback: clear background
    body.style.backgroundImage = '';
  };
  img.src = url;
}

// if we already have games saved, show background for the last one
if(games.length > 0){
  setGameBackground(games[games.length-1].name);
}

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
  setGameBackground(name);
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
