FROM node:20-alpine AS production

WORKDIR /app
COPY src/backend/package.json ./
RUN npm install --omit=dev --no-audit
COPY src/backend ./

ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "server.js"]
