FROM node:16 AS builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY ./src ./src
COPY ./README.md .
COPY ./webpack.config.js .
RUN mkdir bin

RUN npm run build

FROM node:16

WORKDIR /usr/src/app
COPY ./www ./www

WORKDIR /usr/src/app/www
COPY --from=builder /usr/src/app/dist/webgazer.js .
COPY --from=builder /usr/src/app/dist/webgazer.js.map .
RUN npm install

EXPOSE 3000
CMD ["npm", "run", "serve"]

