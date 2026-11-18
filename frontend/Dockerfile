FROM node:20-alpine
WORKDIR /app
# Aucune dépendance : le front est servi par le serveur Node natif de src/index.js
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
