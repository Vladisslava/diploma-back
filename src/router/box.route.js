const router = require('express').Router();
const Box = require('../database/models/box.model');
const User = require('../database/models/user.model');

module.exports = function () {
    return router
        .get('/box/:id', async function (req, res) {
            const box = await Box.findById(req.params.id);

            box.password = '';

            res.send({msg: '', box});
        })
        .get('/box/all/:page', async function (req, res) {
            const boxes = await Box.paginate({}, {page: req.params.page, limit: 6});

            res.send({msg: '', boxes})
        })
        .post('/box', async function (req, res) {
            try {
                const data = await Box.create(req.body);

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

            if (!box) {
                res.send({msg: 'Коробка не найдена', isJoin: false});
                return;
            }

            if (box.isPrivate && box.password !== password) {
                res.send({msg: 'Не верный пароль', isJoin: false});
                return;
            }

            const users = box.users;
            let msg;

            users.push(userId);
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