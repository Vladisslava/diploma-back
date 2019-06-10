FROM node:10

RUN mkdir /opt/diploma-back
WORKDIR /opt/devzone

ADD package.json ./
ADD package-lock.json ./

RUN npm i

ADD . .

EXPOSE 80

CMD ["npm", "run", "start"]
