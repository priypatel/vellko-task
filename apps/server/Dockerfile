# ---- Builder stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Install all dependencies (including dev) for the build.
COPY package*.json ./
RUN npm install

# Compile TypeScript to dist/.
COPY . .
RUN npm run build

# ---- Runner stage ----
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only.
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled output and the SQL migrations.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

EXPOSE 4000
CMD ["node", "dist/app.js"]

# NOTE: Database migrations and seeding use tsx (a dev dependency) and are run
# separately against the managed database before/at deploy time, e.g.:
#   npm run migrate
#   npm run seed
