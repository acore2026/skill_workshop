FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html eslint.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM golang:1.26-alpine AS backend-build
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/cmd ./cmd
COPY backend/server ./server
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/skill-workshop-api ./cmd/skill-workshop-api

FROM alpine:3.22
WORKDIR /app

RUN apk add --no-cache nginx

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/start-container.sh /app/start-container.sh
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=backend-build /out/skill-workshop-api /app/skill-workshop-api
COPY backend/.env.example /app/backend.env.example

RUN chmod +x /app/start-container.sh /app/skill-workshop-api \
  && mkdir -p /run/nginx /var/lib/nginx/tmp /var/log/nginx

EXPOSE 8081 8082

CMD ["/app/start-container.sh"]
