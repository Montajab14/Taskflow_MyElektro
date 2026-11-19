# MyElektro — Front (dossier `frontend/`)

Gestionnaire d'étapes de projets électroniques (sujet TaskFlow). Front en HTML/CSS/JS natif, sans dépendance.

## Lancer
```bash
npm start        # sert src/ sur http://localhost:3000
```

## Écrans

| Route | Contenu |
|---|---|
| `#/tasks` | avancement (résumé calculé par l'API), filtres par statut, recherche, « en retard », tri, liste des étapes |
| `#/tasks/new`, `#/tasks/:id/edit` | formulaire : titre, statut, priorité, échéance, description |
| `#/tasks/:id` | détail d'une étape, suppression avec confirmation |
| `#/habits` | habitudes (bonus B2) : cocher le jour, série en cours, record, 14 derniers jours |
| `#/activity` | activité : indicateurs, heatmap des étapes validées sur 12 mois (B3), créées et validées par semaine (B4) |

« Aujourd'hui » et « en retard » sont jugés dans le fuseau horaire du navigateur : le front l'envoie à l'API (`tz=Europe/Paris`).

## API
Par défaut le front appelle l'API sur `http://localhost:3001/api` (voir `src/js/config.js`).
Pour développer sans backend, mettre `useMock: true` : un faux serveur en localStorage imite l'API (ne jamais l'utiliser en production). Le mock gère la connexion, les étapes (avec filtres et tri) et le résumé, mais pas les habitudes ni l'activité.

## Contrat attendu de l'API
| Action | Requête | Réponse |
|---|---|---|
| Inscription | `POST /auth/register {email,password,name?}` | `201 {token,user}` |
| Connexion | `POST /auth/login {email,password}` | `200 {token,user}` |
| Liste | `GET /tasks` | tableau, ou `{tasks:[…]}` |
| Détail | `GET /tasks/:id` | tâche, ou `{task:{…}}` |
| Liste filtrée | `GET /tasks?status=&q=&overdue=&sort=&tz=` | tableau |
| Ajout | `POST /tasks {title,status,priority,description,dueDate}` | `201` + tâche |
| Édition | `PUT /tasks/:id` (corps complet) | `200` + tâche |
| Suppression | `DELETE /tasks/:id` | `204` ou `200` |

Toutes les routes `/tasks` : en-tête `Authorization: Bearer <jwt>`. Erreurs : `{error, details:[{field,message}]}`.
Tâche d'un autre utilisateur : `404`. L'édition utilise `PUT` (corps complet) : le formulaire envoie toujours `priority`, pour qu'elle ne soit pas remise à `medium`.

Bonus utilisés : `GET /stats/summary`, `GET /stats/heatmap`, `GET /stats/weekly?weeks=12`, `GET|POST /habits`, `DELETE /habits/:id`, `GET /habits/:id/completions?from=&to=`, `PUT|DELETE /habits/:id/completions/:date`.

## Mot de passe (inscription)
Quatre règles, affichées en checklist sous le champ (✗ puis ✓ en direct) : 8 caractères minimum, une majuscule, un chiffre, un caractère spécial. Si elles ne sont pas toutes respectées : « Très bof le mot de passe. ». L'œil affiche ou masque le mot de passe (inscription et connexion). À la connexion, aucune règle n'est imposée, pour ne pas bloquer les comptes existants. Règles définies dans `src/js/validate.js` (`PASSWORD_RULES`).

## Statuts
Valeurs envoyées à l'API : `todo`, `doing`, `done`. Libellés affichés : À faire / Sur le bench / Validé (`STATUS_LABELS` dans `src/js/app.js`).

## Structure
```
src/index.html        écrans (auth + application)
src/css/style.css     thème « établi » : graphite, cuivre, LED de statut
src/js/config.js      apiUrl, useMock
src/js/validate.js    règles de validation (mêmes que l'API)
src/js/api.js         client HTTP, Bearer, erreurs, déconnexion sur 401
src/js/mock.js        faux backend localStorage
src/js/app.js         routeur #/… et vues (étapes, habitudes, activité)
```
