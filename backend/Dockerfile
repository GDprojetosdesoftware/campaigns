# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --only=production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
