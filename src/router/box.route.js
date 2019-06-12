const router = require('express').Router();
const Box = require('../database/models/box.model');
const User = require('../database/models/user.model');
const request = require('request');
const {sendEmail} = require('../service/mailer');
const config = require('../config/default');
const CronJob = require('cron').CronJob;
const moment = require('moment');
const FCM = require('fcm-node');

const serverKey = 'AAAADRbQi1U:APA91bE1KgPbWdH-DBee1rgXf6e2-IvvmQJ1SrSIZa9FBKyO_smZPWdvEgel10VLZsi4e4jDk4_QsY_iwEXRKC1I8zr1pPmN_VsyaZ9M4KJ7D4wYtnFkUrkO5J7CIIJR8pTOEtc3Df0j';
const fcm = new FCM(serverKey);

const keys = [
    'username',
    'email',
    'firstName',
    'lastName',
    'gender',
    'yearOfBirth',
    'phone',
    'photo',
    'country',
    'city',
    'address',
    'postcode'
];

function includesUser(users, id) {
    if (users.leanWithId === 0) return false;

    for (let user of users) {
        if (user.user === id) {
            return true
        }
    }

    return false;
}

function copyObject(obj, keys) {
    const newObject = {};

    for (let key of keys) {
        newObject[key] = obj[key];
    }

    return newObject;
}

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

function timezoneOffset() {
    return new Date().getTimezoneOffset() / 60
}

const getISONow = () => moment().startOf('day').subtract(timezoneOffset(), 'h').toISOString();

async function distributionInBox(box) {
    if (box.users.length === 0) return;

    const newUsers = [];
    const shuffleUsers = shuffle(box.users);
    let prevUser = shuffleUsers[shuffleUsers.length - 1].user;

    if (shuffleUsers[shuffleUsers.length - 1].ward !== null) {
        return;
    }

    for (let i = 0; i < shuffleUsers.length; i++) {
        const userInBox = shuffleUsers[i];
        const newUser = {
            _id: userInBox._id,
            user: userInBox.user,
            ward: prevUser
        };

        newUsers.push(newUser);

        const user = await User.findById(userInBox.user);

        if (user.messageToken) {
            const message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
                to: user.messageToken,

                notification: {
                    title: 'Подаруй',
                    body: 'Сьогодні відбувся розподіл участників у події<${box.name}>'
                },
            };

            fcm.send(message);
        }

        sendEmail({
            from: 'podarui.nastrii@gmail.com',
            to: user.email,
            subject: `Сьогодні відбувся розподіл участників у події<${box.name}>`,
            text: `Можете перейти у подію, щоб дізнатися дані отриманого участника ${config.front}/#/home/boxperson/${box._id}`
        });

        prevUser = userInBox.user
    }

    await Box.findOneAndUpdate({_id: box._id}, {$set: {users: newUsers}}, {new: false});
}

const job = new CronJob('00 00 08 * * *', async function() {
    const data = await Box.find({dateDistribution: getISONow()});

    for (let box of data) {
        await distributionInBox(box)
    }
}, null, true, 'UTC');

job.start();

module.exports = function () {
    return router
        .get('/box/search', async function (req, res) {
            const {query, page} = req.query;

            const boxes = await Box.paginate(
                {
                    name: new RegExp(query, 'i')
                },
                {
                    sort: {
                        dateEnd: 'desc'
                    },
                    page,
                    limit: 6,
                }
            );

            res.send(boxes);
        })
        .get('/box/ward', async function (req, res) {
            const box = await Box.findOne({_id: req.query.box});
            const wardId = box.users.find(item => item.user === req.query.user).ward;
            const user = await User.findOne({_id: wardId});

            res.send({
                data: copyObject(user, keys)
            });
        })
        .get('/box/join', async function (req, res) {
            const {userId, boxId} = req.query;

            const box = await Box.findById(boxId);

            const isJoined = includesUser(box.users, userId);

            res.send({msg: '', isJoined})
        })
        .get('/box/:id', async function (req, res) {
            const box = await Box.findById(req.params.id);

            box.password = '';

            res.send({msg: '', box});
        })
        .get('/box/all/:page', async function (req, res) {
            const boxes = await Box.paginate({}, {
                sort: {
                    dateEnd: 'desc'
                },
                page: req.params.page,
                limit: 6
            });

            res.send({msg: '', boxes})
        })
        .get('/box/user/:id', async function (req, res) {
            const boxes = await Box.paginate({
                users: {
                    $elemMatch: {user: req.params.id}
                }
            }, {
                page: req.query.page,
                limit: 6
            });

            res.send({msg: 'User boxes', boxes})
        })
        .get('/box/user/:id/search', async function (req, res) {
            const {query, page} = req.query;
            const user = await User.findById(req.params.id);

            const boxes = await Box.paginate({
                name: new RegExp(query, 'i'),
                $or: [
                    {
                        users: {
                            $elemMatch: {user: req.params.id}
                        }
                    },
                    {
                        creator: user.username,
                    }
                ],
            }, {page, limit: 6});

            res.send(boxes);
        })
        .get('/box/favorite/:id', async function (req, res) {
            const user = await User.findById(req.params.id);
            const {query = '', page} = req.query;
            const boxesId = user.favoritesBox;

            const boxes = await Box.paginate({
                name: new RegExp(query, 'i'),
                _id: {$in: boxesId}
            }, {
                page,
                limit: 6
            });

            res.send(boxes)
        })
        .get('/box/distribution/:id', async function (req, res) {
            const box = await Box.findById(req.params.id);

            await distributionInBox(box);

            return res.send('ok')
        })
        .put('/box/:id', async function (req, res) {
            const box = await Box.findById(req.params.id);

            if (!box) {
                return res.status(404).send({error: true, msg: 'Подія не знайдена'})
            }

            await Box.findByIdAndUpdate(req.params.id, {$set: req.body}, {new: false});
            const updatedBox = await Box.findById(req.params.id);

            res.send(updatedBox);
        })
        .delete('/box/:id', async function (req, res) {
            await Box.findByIdAndRemove(req.params.id);

            res.send({msg: 'Подія видалена'})
        })
        .post('/box', async function (req, res) {
            try {
                if (!req.body.name) {
                    res.status(400).send({msg: 'Вкажіть назву події'});
                }

                if (!req.body.creator) {
                    res.status(500).send({msg: 'Помилка'});
                }

                const box = await Box.create({...req.body});

                res.status(201).send({msg: 'Подія створена', box});
            } catch (e) {
                res.status(500).send({msg: 'Подія не створена'});
            }
        })
        .post('/box/join', async function (req, res) {
            const {userId, boxId, password} = req.body;

            const box = await Box.findById(boxId);

            if (!box)
                return res.send({msg: 'Подія не знайдена', isJoin: false});

            if (box.isPrivate && box.password !== password)
                return res.send({msg: 'Невірний пароль', isJoin: false});

            const user = await User.findById(userId);

            for (let key of keys)
                if (!user[key])
                    return res.status(403).send({
                        msg: 'Заповніть всю інформацію про себе'
                    });

            if (Date.now() > new Date(box.dateDistribution).getTime())
                return res.status(401).send({
                    msg: 'Вибачте, але минув час розподілу'
                });

            const users = box.users;
            let msg;

            if (!includesUser(users, userId)) {
                users.push({user: userId, ward: null});
            }

            msg = 'Вы берете участь у події';

            await Box.findByIdAndUpdate(boxId, {$set: {users}}, {new: false});

            res.send({msg, isJoin: true});
        })
        .post('/box/leave', async function (req, res) {
            const {userId, boxId, password} = req.body;

            const box = await Box.findById(boxId);

            if (!box) {
                res.send({msg: 'Подія не знайдена', isJoin: false});
                return;
            }

            if (box.isPrivate && box.password !== password) {
                res.send({msg: 'Невірний пароль', isJoin: false});
                return;
            }

            const users = box.users;
            const userIndex = users.indexOf(userId);
            let msg;

            users.splice(userIndex, 1);
            msg = 'Вы покинули подію';

            await Box.findByIdAndUpdate(boxId, {$set: {users}}, {new: false});

            res.send({msg, isJoin: true});
        })
        .post('/box/favorite', async function (req, res) {
            const {userId, boxId} = req.body;

            const user = await User.findById(userId);
            const favoritesBox = user.favoritesBox;
            const index = favoritesBox.indexOf(boxId);

            if (index === -1) {
                favoritesBox.push(boxId)
            } else {
                favoritesBox.splice(index, 1)
            }

            await User.findByIdAndUpdate(userId, {$set: {favoritesBox}}, {new: false});

            res.send({msg: 'Додано в обране', favoritesBox});
        })
};
