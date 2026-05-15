FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (better-sqlite3 requires python and build-essential, but slim has no python by default)
# So we need to install build dependencies first.
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8080

# Run the server
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
