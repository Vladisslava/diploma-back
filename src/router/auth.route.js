const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../database/models/user.model');

module.exports = function () {
    router
        .post('/signin', async function (req, res) {
            let username;
            let password;

            console.log(req.body);
            
            if (req.body.username && req.body.password) {
                username = req.body.username;
                password = req.body.password;
            }

            const user = await User.findOne({username});
            
            if (!user) {
                res.status(401).json({msg: "Пользователь не найдет"});
                return;
            }

            if (user.checkPassword(password)) {
                const payload = {id: user.id};
                const token = jwt.sign(payload, config.jwt.secret);
                res.status(200).json({
                    msg: "Вход выполнен",
                    user: {
                        id: user.id,
                        token: token
                    }
                });
            } else {
                res.status(401).json({msg: "Не верный пароль"});
            }
        })

        .post('/signup', async function (req, res) {
            try {
                const userByLogin = await User.findOne({username: req.body.username});
                const userByEmail = await User.findOne({email: req.body.email});

                if (userByLogin !== null) {
                    res.status(400).send({msg: 'Логин занят, попробуйте другой'});
                    return;
                }

                if (userByEmail !== null) {
                    res.status(400).send({msg: 'Почта занята, попробуйте другую'});
                    return;
                }

                const data = {
                    username: req.body.username,
                    email: req.body.email,
                    password: req.body.password,
                    firstName: '',
                    lastName: '',
                    gender: '',
                    yearOfBirth: 0,
                    phone: '',
                    country: '',
                    city: '',
                    address: '',
                    postcode: 0
                };

                await User.create(data);
                res.status(201).send({msg: 'Аккаунт создан, теперь можете войти'});
            } catch (e) {
                console.log(e);

                res.status(400).send({msg: 'Error'});
            }
        });

    return router;
};