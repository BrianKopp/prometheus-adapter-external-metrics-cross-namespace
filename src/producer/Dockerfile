FROM node:12-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY index.js .

EXPOSE 3000

CMD ["node", "index.js"]
