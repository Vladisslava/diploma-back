FROM node:10

RUN mkdir /opt/diploma-back
WORKDIR /opt/devzone

ADD . ./

RUN npm i

EXPOSE 80

CMD npm run dev
