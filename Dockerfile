FROM node:20-alpine AS production

WORKDIR /app
COPY src/backend/package*.json ./
RUN npm ci --omit=dev
COPY src/backend ./

ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "server.js"]
