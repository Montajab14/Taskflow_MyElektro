// ==========================================================================
// TaskFlow — Serveur Web Local (Node.js natif, sans dépendance externe)
// ==========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SRC_DIR = __dirname; // Répertoire 'src'

// Table des types MIME pour les fichiers statiques
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Nettoyage de l'URL demandée
    let requestUrl = req.url.split('?')[0];

    // Redirection racine vers index.html
    if (requestUrl === '/' || requestUrl === '') {
        requestUrl = '/index.html';
    }

    // Résolution du chemin sécurisé dans 'src'
    const safePath = path.normalize(requestUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(SRC_DIR, safePath);

    // Vérifier que le fichier reste bien dans le dossier src
    if (!filePath.startsWith(SRC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 - Accès interdit');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                        404 - Fichier non trouvé
                    </h1>
                    <p style="text-align: center; color: #666;">Le fichier <code>${requestUrl}</code> n'existe pas dans le dossier <code>src</code>.</p>
                `);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`500 - Erreur serveur: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('\n==================================================');
    console.log(`🚀 Serveur TaskFlow démarré avec succès !`);
    console.log(`👉 Ouvrez votre navigateur sur : http://localhost:${PORT}`);
    console.log('==================================================\n');
});

