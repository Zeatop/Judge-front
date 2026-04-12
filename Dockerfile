# Étape 1 : Build
FROM node:20-alpine AS build
WORKDIR /app

# Injecter l'URL du backend au moment du build
ARG JUDGE_API_URL=http://192.168.1.159:30091
ENV JUDGE_API_URL=$JUDGE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : Serveur Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]