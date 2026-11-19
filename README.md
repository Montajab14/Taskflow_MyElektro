# TaskFlow

Application web de gestion de tâches : chaque utilisateur crée un compte, se connecte et gère ses propres tâches. Une API REST sécurisée par JWT stocke les données dans MongoDB, et un front web les affiche.

| Partie | Technologies | Dossier |
| --- | --- | --- |
| Front | React 19 + Vite, servi par un petit serveur Node.js | [`frontend/`](frontend/README.md) |
| API | Node.js 20+, Express 5, Mongoose, JWT, bcrypt, Swagger | [`backend/`](backend/README.md) |
| Base de données | MongoDB 7 | lancée par `docker-compose.yml` |
| Tests | Jest, Supertest, mongodb-memory-server (166 tests) | `backend/tests/` |

---

## Structure du dépôt

```text
.
├── frontend/             # interface web (voir frontend/README.md)
│   ├── Dockerfile
│   ├── package.json
│   └── src/              # index.html, css/, js/ et le serveur index.js
├── backend/              # API REST (voir backend/README.md)
│   ├── Dockerfile
│   ├── package.json
│   ├── src/              # routes, contrôleurs, services, modèles, validateurs
│   └── tests/            # tests d'intégration et unitaires
├── scripts/start.js      # npm start : prépare .env et lance le docker-compose
├── docker-compose.yml    # MongoDB, Mongo Express, API et front
├── .env.example          # modèle du .env (créé automatiquement par npm start)
├── package.json          # npm start, npm stop, npm run logs
└── README.md
```

---

## Démarrage rapide

Prérequis : Node.js 20 ou plus récent, et Docker (Docker Desktop, ou Colima sur macOS).

```bash
npm start
```

Cette seule commande, à lancer à la racine du dépôt :

- crée le fichier `.env` au premier lancement, avec un mot de passe MongoDB et un secret JWT générés au hasard ;
- choisit un autre port pour MongoDB si 27017 est déjà pris sur la machine, et le garde dans `.env` ;
- démarre Docker s'il est arrêté (Colima) ;
- construit et lance MongoDB, l'API, le front et Mongo Express, puis attend que l'API réponde.

| Service | Adresse |
| --- | --- |
| Front | http://localhost:3000 |
| API | http://localhost:3001/api |
| Documentation de l'API (Swagger) | http://localhost:3001/api/docs |
| Mongo Express (voir la base) | http://localhost:8081 |
| MongoDB | `localhost:27017`, ou le port affiché au lancement |

| Commande | Effet |
| --- | --- |
| `npm start` | lance tout (sans risque si c'est déjà lancé) |
| `npm stop` | arrête tout, les données de la base sont conservées |
| `npm run logs` | affiche les journaux des conteneurs en direct |

Pour effacer aussi la base : `docker compose down -v`.

Aucun identifiant n'est versionné : le `.env` reste sur votre machine. MongoDB ne lit son mot de passe qu'à la création de la base, donc ne modifiez pas `MONGO_ROOT_PASSWORD` dans `.env` une fois la base créée, sauf à repartir d'une base vide.

---

## Développement sans Docker

Chaque partie se lance seule depuis son dossier. MongoDB peut rester dans Docker :

```bash
npm start                            # crée .env et lance tout, dont la base
docker compose stop api frontend     # garde seulement la base (et Mongo Express)

cd backend
npm install
cp .env.example .env                 # puis renseigner MONGO_URI et JWT_SECRET
npm run dev                          # API sur http://localhost:3001
npm test                             # 166 tests, sans base à installer

cd ../frontend
npm install
npm run dev                          # front sur http://localhost:5173 (rechargement à chaud)
npm test                             # tests Vitest
```

Les détails sont dans [`backend/README.md`](backend/README.md) et [`frontend/README.md`](frontend/README.md).

---

## Fonctionnalités

**Socle**

- Inscription et connexion : mots de passe hachés avec bcrypt, sessions par jeton JWT.
- Tâches privées : création, lecture, modification et suppression. Un utilisateur ne voit jamais les tâches d'un autre (réponse 404).
- Validation de toutes les entrées, avec des erreurs détaillées champ par champ : `{ error, details: [{ field, message }] }`.
- Protection contre les essais de mots de passe en série : après 10 échecs, l'API répond 429 pendant 15 minutes.

**Bonus**

- **B1, priorités et filtres** : priorité `low`, `medium` ou `high` ; filtres par statut, priorité, échéance, retard, texte ; tri ; compteur par statut.
- **B2, habitudes** : on coche une habitude jour par jour, avec la série en cours et la meilleure série.
- **B3, heatmap** : tâches terminées par jour sur l'année.
- **B4, statistiques** : tâches créées et terminées par semaine, avec le taux de complétion.

La liste complète des routes est dans [`backend/README.md`](backend/README.md#routes), et testable dans Swagger.

---

## Organisation du travail

- Une branche par fonctionnalité (`feat/…`, `fix/…`, `refactor/…`), fusionnée dans la branche de sa partie (`backend` ou `frontend`), puis dans `main`.
- Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) : `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`.
- Les fichiers `.env`, les secrets et `node_modules/` ne sont jamais versionnés.
