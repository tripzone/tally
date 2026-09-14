# Build the static Vite app. VITE_FIREBASE_* values are baked in at build
# time from .env.local (public client identifiers, not secrets -- same
# reasoning Investogram uses for its firebase-config.js).
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the built static files. Cloud Run injects $PORT (defaults to 8080).
FROM node:20-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]
