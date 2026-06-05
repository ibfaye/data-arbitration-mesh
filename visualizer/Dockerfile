FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY src/ ./src/

EXPOSE 3000
CMD ["npm", "run", "dev"]
