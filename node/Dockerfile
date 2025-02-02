# @file Dockerfile
# @brief Dockerfile for node container
# @author 30hours

FROM node:23.6.1-alpine3.20
WORKDIR /app
COPY package.json server.js RequestQueue.js ./
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]