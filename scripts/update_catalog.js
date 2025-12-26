#!/usr/bin/env node
// Fetches game list from RAWG and writes data/games_catalog.json
// Usage: RAWG_KEY=yourkey node scripts/update_catalog.js
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'data');
const OUT_FILE = path.join(OUT_DIR, 'games_catalog.json');
const RAWG_BASE = 'https://api.rawg.io/api/games';

async function fetchPage(page, page_size, key){
  const url = new URL(RAWG_BASE);
  url.searchParams.set('page', page);
  url.searchParams.set('page_size', page_size);
  if(key) url.searchParams.set('key', key);
  const res = await fetch(url.toString());
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main(){
  const key = process.env.RAWG_KEY; // optional
  console.log('RAWG_KEY present?', !!key);
  try{
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    const page_size = 40;
    const maxPages = 25; // up to ~1000 titles
    const results = [];
    for(let p=1;p<=maxPages;p++){
      console.log(`Fetching page ${p}...`);
      let data;
      try{
        data = await fetchPage(p, page_size, key);
      }catch(err){
        console.error('Fetch failed:', err.message);
        break;
      }
      if(!data || !data.results || data.results.length===0) break;
      for(const g of data.results){
        results.push({
          id: g.id,
          name: g.name,
          released: g.released || null,
          background_image: g.background_image || null,
        });
      }
      // stop early if less than page_size
      if((data.results||[]).length < page_size) break;
      // small delay to be nice
      await new Promise(r => setTimeout(r, 250));
    }

    if(results.length === 0){
      console.log('No results fetched; creating empty catalog.');
    }
    const dedup = [];
    const seen = new Set();
    for(const r of results){
      const k = r.name.toLowerCase();
      if(seen.has(k)) continue;
      seen.add(k);
      dedup.push(r);
    }

    await fs.promises.writeFile(OUT_FILE, JSON.stringify(dedup, null, 2), 'utf8');
    console.log(`Wrote ${dedup.length} games to ${OUT_FILE}`);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
}

main();
