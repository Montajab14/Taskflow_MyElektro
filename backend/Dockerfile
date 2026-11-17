# Image de l'API TaskFlow
FROM node:22-alpine

WORKDIR /app

# Dépendances de production uniquement, versions figées par package-lock.json
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3001

# Pas besoin des droits root pour servir l'API
USER node

CMD ["node", "src/server.js"]
