# Works on Google Cloud Run (Vercel is the main target: see README), Render, Railway, Fly.io, etc.
FROM node:20-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist
ENV NODE_ENV=production
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server/index.js"]
