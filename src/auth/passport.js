const passport = require('passport');
const passportJwt = require('passport-jwt');
const config = require('../config/default.json');
const User = require('../database/models/user.model');

const ExtractJwt = passportJwt.ExtractJwt;
const JwtStrategy = passportJwt.Strategy;

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.secret
};

const strategy = new JwtStrategy(jwtOptions, async function (jwtPayload, next) {
    try {
        const user = await User.findById(jwtPayload.id);
        if (user) {
            next(null, user);
        } else {
            next(null, false);
        }
    } catch (e) {
        next(e);
    }
});

passport.use(strategy);

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

module.exports = passport;
