FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    gcc g++ \
    openjdk-17-jdk-headless \
    python3 \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src

EXPOSE 5001
CMD ["npm", "start"]
