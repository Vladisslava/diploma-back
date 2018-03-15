const router = require('express').Router();
const Box = require('../database/models/box.model');

module.exports = function () {
    return router
        .get('/box', async function (req, res) {
            const boxes = await Box.find({});
            
            res.send({msg: boxes});
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
};