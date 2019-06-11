const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'podarui.nastrii@gmail.com',
        pass: 'Qwerty12345Q.'
    }
});

async function sendEmail(options) {
    return new Promise((resolve, reject) => {
        transporter.sendMail(options, function(error, info){
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    })
}

exports.transporter = transporter;
exports.sendEmail = sendEmail;
