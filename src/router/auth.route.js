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
                res.status(401).json({msg: "Користувача не знайдено!"});
                return;
            }

            if (user.checkPassword(password)) {
                const payload = {id: user.id};
                const token = jwt.sign(payload, config.jwt.secret);

                await User.findByIdAndUpdate(user.id, {$set: {messageToken}},  { new: false });

                res.status(200).json({
                    msg: "Вхід виконано!",
                    user: {
                        id: user.id,
                        token: token
                    }
                });
            } else {
                res.status(401).json({msg: "Невірний пароль!"});
            }
        })
        .post('/signup', async function (req, res) { // Регистрация
            try {
                const userByLogin = await User.findOne({username: req.body.username});
                const userByEmail = await User.findOne({email: req.body.email});

                if (userByLogin !== null) {
                    res.status(400).send({msg: 'Логін зайнятий, спробуйте інший!'});
                    return;
                }

                if (userByEmail !== null) {
                    res.status(400).send({msg: 'Пошта зайнята, спробуйте іншу!'});
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
                    from: 'podarui.nastrii@gmail.com',
                    to: req.body.email,
                    subject: 'Код активації',
                    text: `Щоб активувати обліковий запис перейдіть за посиланням - ${FRONT_HOST}/api/activate/${activationToken}`
                });

                res.status(201).send({msg: 'Аккаунт створений, тепер можете увійти!'});
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
                return res.status(404).send({msg: `Невірний код`});

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
                msg: 'Пароль відновлений'
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
                from: 'podarui.nastrii@gmail.com',
                to: email,
                subject: 'Відновлення пароля',
                text: `Код для відновлення пароля - ${code}.`
            });

            res.status(201).send({
                msg: 'Код відправлений на пошту!'
            })
        })
        .get('/activate/:token', async function (req, res) {
            const {username, token} = await ActivationToken.findOne({token: req.params.token});
            if (username) {
                await ActivationToken.update({token}, {active: true});
                await User.update({username}, {active: true});

                res.redirect(301, `http://${host}${frontPort}/`);
            } else {
                res.send('Код не знайдений!');
            }
        })
    ;

    return router;
};
