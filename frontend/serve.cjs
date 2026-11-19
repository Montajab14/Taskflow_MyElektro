// Serveur statique sans dépendance pour le dossier dist/ (utilisé par Docker et `npm start`).
// Le routeur du front utilise « #/… » : il n'y a pas de redirection serveur à prévoir.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.map': 'application/json',
};

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0]); } catch { pathname = '/'; }
  const file = path.join(DIST, path.normalize(pathname === '/' ? '/index.html' : pathname));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) {
    res.writeHead(403).end('403');
    return;
  }
  fs.readFile(file, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(err.code === 'ENOENT' || err.code === 'EISDIR' ? '404 - Fichier non trouvé' : '500');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(content);
  });
}).listen(PORT, () => console.log(`MyElektro : http://localhost:${PORT}`));
