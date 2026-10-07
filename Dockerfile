FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS test

COPY . .
RUN npm run check
RUN npm test

FROM dependencies AS build

COPY . .
RUN npm run build
