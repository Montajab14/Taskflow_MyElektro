# --- Étape 1 : compilation (Vite produit des fichiers statiques dans dist/) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# L'URL de l'API est figée à la compilation (voir .env.example)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Étape 2 : exécution (serveur Node sans dépendance, pas de node_modules) ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/dist ./dist
COPY serve.cjs ./
USER node
EXPOSE 3000
CMD ["node", "serve.cjs"]
