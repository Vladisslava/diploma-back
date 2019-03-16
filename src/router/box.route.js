const router = require('express').Router();
const Box = require('../database/models/box.model');
const User = require('../database/models/user.model');

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

module.exports = function () {
    return router
        .get('/box/search', async function (req, res) {
            const {query, page} = req.query;

            const boxes = await Box.paginate({name: new RegExp(query)}, {page, limit: 6});

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
            const boxes = await Box.paginate({users: {$elemMatch: {user: req.params.id}}}, {
                page: req.query.page,
                limit: 6
            });

            res.send({msg: 'User boxes', boxes})
        })
        .get('/box/favorite/:id', async function (req, res) {
            const user = await User.findById(req.params.id);
            const boxesId = user.favoritesBox;

            const boxes = await Box.paginate({_id: {$in: boxesId}}, {page: req.query.page, limit: 6});

            res.send({msg: 'favorite', boxes: boxes})
        })
        .post('/box', async function (req, res) {
            try {
                await Box.create({...req.body, users: []});

                res.status(201).send({msg: 'Коробка создана'});
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Коробка не создана'});
            }

            res.send('sdas');
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