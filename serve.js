const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8000;
const root = path.resolve(__dirname);

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
    if (cached && (Date.now() - cached.ts) < 60_000) {
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

      // crude parsing: find links that reference /trophies/ or /game/ and capture the link text
      const re = /<a[^>]+href=["']([^"']*(?:trophies|game)[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
      const names = [];
      const hrefs = [];
      let m;
      while ((m = re.exec(html)) !== null) {
        const href = m[1];
        const name = m[2].trim();
        if (name && !names.includes(name)) {
          names.push(name);
          hrefs.push(href);
        }
      }

      // collect image sources on the page and try to map to found names by proximity/index
      const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const imgs = [];
      let im;
      while ((im = imgRe.exec(html)) !== null) {
        imgs.push(im[1]);
      }

      // build objects with optional image
      const items = names.map((n, idx) => ({ name: n, href: hrefs[idx] || null, image: imgs[idx] || null }));

      cache.set(cacheKey, { ts: Date.now(), data: items });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user, games: items }));
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
