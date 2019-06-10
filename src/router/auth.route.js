const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('../config/default.json');
const User = require('../database/models/user.model');
const ForgotCodeModel = require('../database/models/forgot-codes.model');
const ActivationToken = require('../database/models/activation-token.model');
const uuidv4 = require('uuid/v4');
const {sendEmail} = require('../service/mailer');
const {FRONT_HOST} = require('../constants');
const host = '192.168.8.100';
const frontPort = ':3000';

module.exports = function () {
    router
        .post('/signin', async function (req, res) {
            let username;
            let password;
            let messageToken = req.body.messageToken;
            
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

                await User.findByIdAndUpdate(user.id, {$set: {messageToken}},  { new: false });

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
        .post('/signup', async function (req, res) { // Регистрация
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
                    photo: '/avatar/img.png',
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
                    text: `Чтобы активировать аккаунт перейдите по ссылке - ${FRONT_HOST}api/activate/${activationToken}`
                });

                res.status(201).send({msg: 'Аккаунт создан, теперь можете войти'});
            } catch (e) {
                console.log(e);

                res.status(400).send({
                    msg: 'Error',
                    error: true,
                    stacktrace: e,
                });
            }
        })
        .put('/forgot', async function (req, res) {
            const {password, code, email} = req.body;

            const currentEmail = await ForgotCodeModel.findOne({email, code});

            if (!currentEmail)
                return res.status(404).send({msg: `Не верный код`});

            await ForgotCodeModel.deleteOne({email, code});

            await User.findOne({email}, function (err, doc) {
                if (err)
                    return;

                if (doc) {
                    doc.password = password;
                    doc.save();
                }
            });

            return res.send({
                msg: 'Пароль восстановлен'
            })
        })
        .post('/forgot', async function (req, res) {
            const email = req.body.email;

            const code = uuidv4();

            await ForgotCodeModel.create({
                email,
                code
            });

            await sendEmail({
                from: 'antsiferovmaximv@gmail.com',
                to: email,
                subject: 'Восстановление пароля',
                text: `Код для восстановления пароля - ${code}.`
            });

            res.status(201).send({
                msg: 'Код отправлен на почту'
            })
        })
        .get('/activate/:token', async function (req, res) {
            const {username, token} = await ActivationToken.findOne({token: req.params.token});
            if (username) {
                await ActivationToken.update({token}, {active: true});
                await User.update({username}, {active: true});

                res.redirect(301, `http://${host}${frontPort}/`);
            } else {
                res.send('Код не найден');
            }
        })
    ;

    return router;
};
