FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS test

COPY . .

CMD ["sh", "-c", "npm run check && npm test"]

FROM test AS build

RUN npm run check && npm test && npm run build

FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1/healthz || exit 1
