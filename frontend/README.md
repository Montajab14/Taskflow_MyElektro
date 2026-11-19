# MyElektro — Front (dossier `frontend/`)

Gestionnaire d'étapes de projets électroniques (sujet TaskFlow). Front **React 19** compilé avec **Vite**.

## Lancer
```bash
npm install
npm run dev      # http://localhost:5173, rechargement à chaud
npm test         # tests Vitest + Testing Library
npm run lint     # ESLint
npm start        # compile (vite build) puis sert dist/ sur http://localhost:3000
```
Avec Docker, `npm start` à la racine du dépôt compile et sert le front (voir `Dockerfile`).

## Structure
```
src/
  main.jsx            point d'entrée : HashRouter + fournisseurs (Toast, Auth, Confirm)
  App.jsx             routes, dont les routes protégées
  api/client.js       tous les appels HTTP (jeton Bearer, erreurs normalisées, 401)
  context/            AuthContext (session), ToastContext, ConfirmContext (boîte <dialog>)
  components/         Layout, PasswordField (œil + checklist), ProgressPanel, Led, Icon, ErrorPanel
  pages/              AuthPage, TaskListPage, TaskDetailPage, TaskFormPage, HabitsPage, ActivityPage
  lib/                validate (règles), dates, labels, useAsync (chargement), formErrors
  styles/style.css    thème « établi » (graphite, cuivre, LED)
```

## Écrans (adresses en `#/…`)

| Route | Contenu |
|---|---|
| `#/login` | connexion / inscription (checklist du mot de passe, icône œil) |
| `#/tasks` | avancement (résumé calculé par l'API), filtres par statut, recherche, « en retard », tri, liste |
| `#/tasks/new`, `#/tasks/:id/edit` | formulaire : titre, statut, priorité, échéance, description |
| `#/tasks/:id` | détail d'une étape, suppression avec confirmation |
| `#/habits` | habitudes (B2) : cocher le jour, série en cours, record, 14 derniers jours |
| `#/activity` | indicateurs, heatmap sur 12 mois (B3), créées et validées par semaine (B4) |

« Aujourd'hui » et « en retard » sont jugés dans le fuseau du navigateur : le front l'envoie à l'API (`tz=Europe/Paris`).

## API
L'URL de l'API vient de `VITE_API_URL` (défaut `http://localhost:3001/api`, voir `.env.example`). Elle est figée à la compilation.
Le client accepte une liste en tableau, `{items}` ou `{tasks}`, et une erreur en chaîne ou `{code,message}`.

Le jeton JWT est gardé dans le `localStorage` : simple et conservé après rechargement, mais lisible par tout script de la page (risque XSS). React échappe tout le texte affiché et le front n'utilise jamais `dangerouslySetInnerHTML`. Sur un 401, la session est effacée et l'utilisateur revient à la connexion.

## Contrat attendu de l'API
| Action | Requête | Réponse |
|---|---|---|
| Inscription | `POST /auth/register {email,password,name?}` | `201 {token,user}` |
| Connexion | `POST /auth/login {email,password}` | `200 {token,user}` |
| Liste filtrée | `GET /tasks?status=&q=&overdue=&sort=&tz=` | tableau |
| Détail | `GET /tasks/:id` | tâche |
| Ajout | `POST /tasks {title,status,priority,description,dueDate}` | `201` + tâche |
| Édition | `PUT /tasks/:id` (corps complet) | `200` + tâche |
| Suppression | `DELETE /tasks/:id` | `204` |
| Statistiques | `GET /stats/summary`, `/stats/heatmap`, `/stats/weekly?weeks=12` | objets |
| Habitudes | `GET/POST /habits`, `DELETE /habits/:id`, `PUT/DELETE /habits/:id/completions/:date` | — |

Toutes les routes sauf `/auth/*` : en-tête `Authorization: Bearer <jwt>`.
