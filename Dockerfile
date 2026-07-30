FROM node:20-alpine AS production

LABEL org.opencontainers.image.source="https://github.com/SufiyanAasim/digiwallsys"
LABEL org.opencontainers.image.description="digiwallsys Express API and background-worker runtime"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json package-lock.json ./
COPY src/backend/package.json ./src/backend/package.json
RUN npm ci --omit=dev --workspace @digiwallsys/api --include-workspace-root=false
COPY src/backend ./src/backend
WORKDIR /app/src/backend

ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "server.js"]
