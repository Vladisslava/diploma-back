const path = require('path');
const express = require('express');
const config = require('./config/default');
const bodyParser = require('body-parser');
const passport = require('./auth/passport');
const dbConnect = require('./database/mongodb');
const logger = require('morgan');
const moment = require('moment');
const {sendEmail} = require('./service/mailer');
const {FRONT_HOST} = require('./constants');

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

const routes = require('./router')(passport);
const api = express();
const port = process.env.PORT || config.api.port;

dbConnect();

const Box = require('./database/models/box.model');
const User = require('./database/models/user.model');

function timezoneOffset() {
    return new Date().getTimezoneOffset() / 60
}

const getISONow = () => moment().startOf('day').subtract(timezoneOffset(), 'h').toISOString();

(async () => {
    const data = await Box.find({dateDistribution: getISONow()});

    for (let box of data) {
        if (box.users.length === 0) continue;

        const newUsers = [];
        const shuffleUsers = shuffle(box.users);
        let prevUser = shuffleUsers[shuffleUsers.length - 1].user;

        for (let i = 0; i < shuffleUsers.length; i++) {
            const userInBox = shuffleUsers[i];
            const newUser = {
                _id: userInBox._id,
                user: userInBox.user,
                ward: prevUser
            };

            newUsers.push(newUser);

            const user = await User.findById(userInBox.user);

            sendEmail({
                from: 'antsiferovmaximv@gmail.com',
                to: user.email,
                subject: `Сегодня произошло распределения подарков в коробке <${box.name}>`,
                text: `Можете перейти в коробку, чтобы узнать сабмиссива ${FRONT_HOST}home/boxperson/${box._id}`
            });

            prevUser = userInBox.user
        }

        await Box.findOneAndUpdate({_id: box._id}, {$set: {users: newUsers}}, {new: false});
    }
})();

api
    .use(logger(function (tokens, req, res) {
        return [
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ')
    }))
    .use(function (req, res, next) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', '"GET,POST,PUT,DELETE');

        next();
    })
    .use(express.static(path.join(__dirname, 'public')))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(passport.initialize())
    .use('/', routes);

setTimeout(() => {
    api.listen(config.api.port, () => {
        console.log('Api starting in http://localhost:' + port);
    });
}, 2000);

