const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/* Assets that can be compressed (text-based) */
const COMPRESSIBLE = new Set([
  '.html', '.css', '.js', '.json', '.svg',
]);

/* Cache durations */
const CACHE_LONG = 'public, max-age=31536000, immutable';   // 1 year – images, fonts
const CACHE_SHORT = 'public, max-age=3600, stale-while-revalidate=86400'; // 1h – HTML

http.createServer((req, res) => {
  /* Block obvious bad paths */
  const url = req.url.split('?')[0].split('#')[0];
  if (url.includes('..')) { res.writeHead(400); res.end(); return; }

  const filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };

    /* Cache headers */
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.woff2'].includes(ext)) {
      headers['Cache-Control'] = CACHE_LONG;
    } else if (ext === '.html') {
      headers['Cache-Control'] = CACHE_SHORT;
    } else {
      headers['Cache-Control'] = CACHE_LONG;
    }

    /* Gzip for text-based assets */
    const acceptEncoding = (req.headers['accept-encoding'] || '');
    if (COMPRESSIBLE.has(ext) && acceptEncoding.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      headers['Content-Length'] = stat.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
}).listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));
