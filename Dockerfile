FROM node:10

RUN mkdir /opt/diploma-back
WORKDIR /opt/devzone

ADD . ./

EXPOSE 3010

CMD npm run dev