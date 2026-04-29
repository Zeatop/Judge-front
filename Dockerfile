# Étape 1 : Build
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_JUDGE_API_URL=https://api.judgeai.app
ENV VITE_JUDGE_API_URL=$VITE_JUDGE_API_URL
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : Serveur Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]