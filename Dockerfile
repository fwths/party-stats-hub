# Stage 1: Build the application and compile native dependencies
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 native C++ bindings
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run seed

# Remove development dependencies to keep the production footprint small
RUN npm prune --omit=dev

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Copy production dependencies and build artifacts from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/sqlite.db ./sqlite.db

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server, bootstrapping the persisted Fly volume on first deploy
CMD ["sh", "-c", "mkdir -p /data && if [ ! -f /data/sqlite.db ]; then echo 'Initializing persistent database...'; cp /app/sqlite.db /data/sqlite.db; fi && npm run start"]
