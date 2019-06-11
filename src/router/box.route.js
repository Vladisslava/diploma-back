const router = require('express').Router();
const Box = require('../database/models/box.model');
const User = require('../database/models/user.model');
const request = require('request');
const {sendEmail} = require('../service/mailer');
const config = require('../config/default');

const keys = [
    'username',
    'email',
    'firstName',
    'lastName',
    'gender',
    'yearOfBirth',
    'phone',
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
            request({
                method: 'POST',
                uri: 'https://fcm.googleapis.com',
                headers: {
                    Authorization: 'key=AAAADRbQi1U:APA91bE1KgPbWdH-DBee1rgXf6e2-IvvmQJ1SrSIZa9FBKyO_smZPWdvEgel10VLZsi4e4jDk4_QsY_iwEXRKC1I8zr1pPmN_VsyaZ9M4KJ7D4wYtnFkUrkO5J7CIIJR8pTOEtc3Df0j'
                },
                postData: {
                    mimeType: 'application/json',
                    params: {
                        "notification": {
                            "title": "Surprise",
                            "body": "Вы получили подопечного",
                            "icon": "https://eralash.ru.rsz.io/sites/all/themes/eralash_v5/logo.png?width=40&height=40",
                            "click_action": config.front
                        },
                        "to": user.messageToken
                    }
                }
            });
        }

        sendEmail({
            from: 'antsiferovmaximv@gmail.com',
            to: user.email,
            subject: `Сегодня произошло распределения подарков в коробке <${box.name}>`,
            text: `Можете перейти в коробку, чтобы узнать подопечного ${config.front}/#/home/boxperson/${box._id}`
        });

        prevUser = userInBox.user
    }

    await Box.findOneAndUpdate({_id: box._id}, {$set: {users: newUsers}}, {new: false});
}

module.exports = function () {
    return router
        .get('/box/search', async function (req, res) {
            const {query, page} = req.query;

            const boxes = await Box.paginate(
                {
                    name: new RegExp(query, 'i')
                },
                {page, limit: 6}
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
            const boxes = await Box.paginate({}, {page: req.params.page, limit: 6});

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
                return res.status(404).send({error: true, msg: 'Коробка не найдена'})
            }

            await Box.findByIdAndUpdate(req.params.id, {$set: req.body}, {new: false});
            const updatedBox = await Box.findById(req.params.id);

            res.send(updatedBox);
        })
        .delete('/box/:id', async function (req, res) {
            await Box.findByIdAndRemove(req.params.id);

            res.send({msg: 'Коробка удалена'})
        })
        .post('/box', async function (req, res) {
            try {
                if (!req.body.name) {
                    res.status(400).send({msg: 'Укажите название коробки'});
                }

                if (!req.body.creator) {
                    res.status(500).send({msg: 'Ошибка'});
                }

                const box = await Box.create({...req.body});

                res.status(201).send({msg: 'Коробка создана', box});
            } catch (e) {
                res.status(500).send({msg: 'Коробка не создана'});
            }
        })
        .post('/box/join', async function (req, res) {
            const {userId, boxId, password} = req.body;

            const box = await Box.findById(boxId);

            if (!box)
                return res.send({msg: 'Коробка не найдена', isJoin: false});

            if (box.isPrivate && box.password !== password)
                return res.send({msg: 'Не верный пароль', isJoin: false});

            const user = await User.findById(userId);

            for (let key of keys)
                if (!user[key])
                    return res.status(403).send({
                        msg: 'Заполните всю инофрмацию о себе'
                    });

            if (Date.now() > new Date(box.dateDistribution).getTime())
                return res.status(401).send({
                    msg: 'Извините, но прошло время распределения'
                });

            const users = box.users;
            let msg;

            if (!includesUser(users, userId)) {
                users.push({user: userId, ward: null});
            }

            msg = 'Вы вступили в коробку';

            await Box.findByIdAndUpdate(boxId, {$set: {users}}, {new: false});

            res.send({msg, isJoin: true});
        })
        .post('/box/leave', async function (req, res) {
            const {userId, boxId, password} = req.body;

            const box = await Box.findById(boxId);

            if (!box) {
                res.send({msg: 'Коробка не найдена', isJoin: false});
                return;
            }

            if (box.isPrivate && box.password !== password) {
                res.send({msg: 'Не верный пароль', isJoin: false});
                return;
            }

            const users = box.users;
            const userIndex = users.indexOf(userId);
            let msg;

            users.splice(userIndex, 1);
            msg = 'Вы вышли из коробки';

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

            res.send({msg: 'Фаворит выбран', favoritesBox});
        })
};
