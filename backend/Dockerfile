FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY backend ./backend
COPY public ./public
RUN mkdir -p /app/backend/data && chown -R node:node /app
USER node
ENV PORT=8080 DATA_DIR=/app/backend/data
EXPOSE 8080
CMD ["node", "backend/server.mjs"]
