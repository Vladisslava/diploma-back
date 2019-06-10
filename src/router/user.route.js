const router = require('express').Router();
const User = require('../database/models/user.model');
const fs = require('fs');
const path = require('path');

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
                    photo: user.photo,
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

                res.status(200).send({msg: 'Информация обновленна', user: data});
            } catch (e) {
                console.log(e);

                res.status(500).send({msg: 'Сервер временно не работает :('});
            }
        })
        .post('/user/:id/photo/', async function (req, res) {
            const publicFolder= path.resolve(process.cwd(), 'public');
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
