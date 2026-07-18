# backend/Dockerfile — containerizes the agent + CRUD API.
# Build:  docker build -t personal-agent-api ./backend
# Run:    docker run --env-file backend/.env -p 5001:5001 personal-agent-api
FROM node:20-alpine AS base
WORKDIR /app

# Install production deps first (better layer caching).
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# App source.
COPY . .

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001

# Lightweight healthcheck hits the DB-independent /health route.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5001/health || exit 1

CMD ["node", "server.js"]
