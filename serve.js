const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8000;
const root = path.resolve(__dirname);
const cheerio = require('cheerio');

// Cache TTL for psnprofiles results (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const cache = new Map(); // simple in-memory cache

http.createServer(async (req, res) => {
  // simple routing for API endpoints
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/api/psnprofiles/import') {
    const user = url.searchParams.get('user') || '';
    if (!user) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'missing user' }));
    }

    const cacheKey = `psn:${user}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user, games: cached.data }));
    }

    try {
      const target = `https://psnprofiles.com/${encodeURIComponent(user)}`;
      const r = await fetch(target, { headers: { 'User-Agent': 'psn-bibliothek/1.0 (+https://github.com)' } });
      if (!r.ok) {
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: `remote ${r.status}` }));
      }
      const html = await r.text();

      // Use cheerio for robust parsing instead of fragile regex
      const $ = cheerio.load(html);
      const items = [];

      // Find anchors that likely point to game/trophy pages and extract text + nearby image
      $('a[href*="/trophies"], a[href*="/game"]').each((i, a) => {
        const href = $(a).attr('href') || null;
        const name = $(a).text().trim();
        if (!name) return;

        // try to find an image in the same card/container
        let image = null;
        const $a = $(a);
        // search within the anchor first
        image = $a.find('img').first().attr('src') || null;
        if (!image) {
          // search up to a few parent containers for an image
          const parentImgs = $a.closest('li, .game, .card, .block').find('img');
          if (parentImgs.length) image = $(parentImgs[0]).attr('src');
        }

        // normalize relative URLs to absolute using target origin
        if (image && image.startsWith('/')) {
          const base = new URL(r.url || target).origin;
          image = base + image;
        }

        // avoid duplicates by name
        if (!items.find(it => it.name.toLowerCase() === name.toLowerCase())) {
          items.push({ name, href, image });
        }
      });

      // fallback: if no items found, try to extract any link texts as fallback
      if (items.length === 0) {
        $('a').each((i, a) => {
          const name = $(a).text().trim();
          if (name && name.length > 2 && !items.find(it => it.name === name)) {
            items.push({ name, href: $(a).attr('href') || null, image: null });
          }
        });
      }

      cache.set(cacheKey, { ts: Date.now(), data: items });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user, games: items }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // Accept raw HTML upload for parsing (useful when remote site blocks scraping)
  if (url.pathname === '/api/psnprofiles/parse' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      let html = '';
      try {
        const parsed = JSON.parse(body);
        html = parsed.html || '';
      } catch (e) {
        // not JSON, treat body as raw HTML
        html = body;
      }

      if (!html) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'missing html body' }));
      }

      const $ = cheerio.load(html);
      const items = [];
      $('a[href*="/trophies"], a[href*="/game"]').each((i, a) => {
        const href = $(a).attr('href') || null;
        const name = $(a).text().trim();
        if (!name) return;
        let image = $(a).find('img').first().attr('src') || null;
        if (!image) {
          const parentImgs = $(a).closest('li, .game, .card, .block').find('img');
          if (parentImgs.length) image = $(parentImgs[0]).attr('src');
        }
        items.push({ name, href, image });
      });
      if (items.length === 0) {
        // fallback: collect meaningful link texts
        $('a').each((i, a) => {
          const name = $(a).text().trim();
          if (name && name.length > 2 && !items.find(it => it.name === name)) {
            items.push({ name, href: $(a).attr('href') || null, image: null });
          }
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ games: items }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  let reqPath = url.pathname;
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(root, decodeURIComponent(reqPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
