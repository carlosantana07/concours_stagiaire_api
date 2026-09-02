FROM node:20.19.6-alpine 
WORKDIR /app
COPY package*.json ./
RUN  npm ci --omit=dev

COPY . .

RUN npx prisma generate

USER node

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "npm", "start" ]