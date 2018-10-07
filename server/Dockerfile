FROM mhart/alpine-node

WORKDIR /usr/src/app

#Install dependencies (Only the production dependencies)
COPY package*.json ./

RUN npm install

# Copy all files
COPY index.js questions.js redis-config.js .babelrc package-lock.json ./

EXPOSE 3000

CMD [ "npm", "run", "start" ]
