const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../database/models/user.model');
const ActivationToken = require('../database/models/activation-token.model');
const uuidv4 = require('uuid/v4');
const {sendEmail} = require('../service/mailer');

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
                    active: false,
                    postcode: 0,
                    favoritesBox: []
                };

                await User.create(data);

                const activationToken = uuidv4();
                await ActivationToken.create({
                    username: req.body.username,
                    token: activationToken,
                    active: false
                });

                await sendEmail({
                    from: 'antsiferovmaximv@gmail.com',
                    to: req.body.email,
                    subject: 'Код активации',
                    text: 'Чтобы активировать аккаунт перейдите по ссылке - http://localhost:3010/api/activate/' + activationToken
                });

                res.status(201).send({msg: 'Аккаунт создан, теперь можете войти'});
            } catch (e) {
                console.log(e);

                res.status(400).send({msg: 'Error'});
            }
        })
        .get('/activate/:token', async function (req, res) {
            const {username, token} = await ActivationToken.findOne({token: req.params.token});
            if (username) {
                await ActivationToken.update({token}, {active: true});
                await User.update({username}, {active: true});

                res.send('Аккаунт активирован');
            } else {
                res.send('Код не найден');
            }
        })
    ;

    return router;
};