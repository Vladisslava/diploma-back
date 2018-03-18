const router = require('express').Router();
const User = require('../database/models/user.model');

module.exports = function () {
    return router
        .get('/user/:id', async function (req, res) {
            try {
                const user = await User.findById(req.params.id);

                if (!user) {
                    res.status(404).send({msg: 'Пользователь не найден'});
                    return;
                }

                const info = {
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    gender: user.gender,
                    yearOfBirth: +user.yearOfBirth,
                    phone: user.phone,
                    country: user.country,
                    city: user.city,
                    address: user.address,
                    postcode: +user.postcode,
                    favoritesBox: user.favoritesBox
                };
                
                res.status(200).send({msg: '', user: info})
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Сервер временно не работает :('})
            }
        })
        .put('/user/:id', async function (req, res) {
            try {
                let user = await User.findById(req.params.id);

                if (!user) {
                    res.status(404).send({msg: 'Пользователь не найден'});
                    return;
                }

                await User.findByIdAndUpdate(req.params.id, {$set: req.body},  { new: false });
                const newUser = await User.findById(req.params.id);
                
                const data = {};

                for (let key in newUser) {
                    ([
                        'username', 'email', 'firstName', 'lastName',
                        'gender', 'yearOfBirth', 'phone', 'country',
                        'city', 'address', 'postcode', 'favoritesBox'
                    ].indexOf(key) > -1) && (data[key] = newUser[key]);
                }

                res.status(200).send({msg: 'Информация обновленна', user: data});
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Сервер временно не работает :('});
            }
        });
};