const router = require('express').Router();
const User = require('../database/models/user.model');
const fs = require('fs');
const path = require('path');
const FCM = require('fcm-node');

const serverKey = 'AAAADRbQi1U:APA91bE1KgPbWdH-DBee1rgXf6e2-IvvmQJ1SrSIZa9FBKyO_smZPWdvEgel10VLZsi4e4jDk4_QsY_iwEXRKC1I8zr1pPmN_VsyaZ9M4KJ7D4wYtnFkUrkO5J7CIIJR8pTOEtc3Df0j';
const fcm = new FCM(serverKey);

module.exports = function () {
    return router
        .get('/user/:id', async function (req, res) {
            try {
                const user = await User.findById(req.params.id);

                if (!user) {
                    res.status(404).send({msg: 'Користувача не знайдено'});
                    return;
                }

                const info = {
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    gender: user.gender,
                    yearOfBirth: user.yearOfBirth,
                    phone: user.phone,
                    country: user.country,
                    photo: user.photo,
                    city: user.city,
                    address: user.address,
                    postcode: +user.postcode,
                    favoritesBox: user.favoritesBox
                };

                res.status(200).send({msg: '', user: info})
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Сервер тимчасово не працює :('})
            }
        })
        .get('/user/:id/message', async function (req, res) {
            const user = await User.findById(req.params.id);

            const message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
                to: user.messageToken,

                notification: {
                    title: 'Title of your push notification',
                    body: 'Body of your push notification'
                },

                data: {  //you can send only notification or only data(or include both)
                    my_key: 'my value',
                    my_another_key: 'my another value'
                }
            };

            try {
                const data = await new Promise((resolve, reject) => {
                    fcm.send(message, function (err, response) {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(response);
                        }
                    });
                });

                res.send(data)
            } catch (e) {
                res.status(500).send(e)
            }
        })
        .post('/user/:id/message', async function (req, res) {
            await User.findByIdAndUpdate(req.params.id, {
                $set: {
                    messageToken: req.body.messageToken,
                }
            }, {new: false});

            res.send({msg: 'ok'});
        })
        .put('/user/:id', async function (req, res) {
            try {
                let user = await User.findById(req.params.id);

                if (!user) {
                    res.status(404).send({msg: 'Користувача не знайдено'});
                    return;
                }

                await User.findByIdAndUpdate(req.params.id, {$set: req.body}, {new: false});
                const newUser = await User.findById(req.params.id);

                const data = {};

                for (let key in newUser) {
                    ([
                        'username', 'email', 'firstName', 'lastName',
                        'gender', 'yearOfBirth', 'phone', 'country',
                        'city', 'address', 'postcode', 'favoritesBox',
                        'photo',
                    ].indexOf(key) > -1) && (data[key] = newUser[key]);
                }

                res.status(200).send({msg: 'Інформація оновлена', user: data});
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Сервер тимчасово не працює :('});
            }
        })
        .post('/user/:id/photo/', async function (req, res) {
            const publicFolder = path.resolve(process.cwd(), 'public');
            const folder = publicFolder + '/avatar';
            const user = await User.findById(req.params.id);
            const image = req.files.file;
            const ext = getExtension(image.name);
            const defaultImage = '/avatar/img.png';

            if (ext !== 'png' && ext !== 'jpeg' && ext !== 'jpg') {
                return res.status(400).send({error: true, msg: 'Bad image'})
            }

            if (user.photo === defaultImage) {
                const newAvatar = `${folder}/${image.md5}.${ext}`;

                return image.mv(
                    newAvatar,
                    async function (err) {
                        if (err) {
                            return res.status(500).send(err)
                        }

                        const newImageUrl = `/avatar/${image.md5}.${ext}`;

                        await User.findByIdAndUpdate(req.params.id, {
                            $set: {
                                photo: newImageUrl
                            }
                        }, {new: false});
                        res.json({
                            image: newImageUrl,
                        })
                    },
                )
            }

            const oldImagePath = `${publicFolder}/${user.photo}`;
            const newPath = `${publicFolder}/avatar/${image.md5}.${ext}`;
            fs.unlinkSync(oldImagePath);
            image.mv(
                newPath,
                async function (err) {
                    if (err) {
                        return res.status(500).send(err)
                    }

                    const newImageUrl = `/avatar/${image.md5}.${ext}`;

                    await User.findByIdAndUpdate(req.params.id, {
                        $set: {
                            photo: newImageUrl
                        }
                    }, {new: false});

                    res.json({
                        image: newImageUrl,
                    })
                },
            )
        });
};

const getExtension = name => {
    const chunks = name.split('.');
    return chunks[chunks.length - 1];
};
