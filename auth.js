/**
 * Created by keyvan on 8/20/16.
 */

import {KoaPassport} from 'koa-passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import jwt from 'jsonwebtoken';
import {executeCypher} from './data'


const passport = new KoaPassport();
const secret = 'secret';

// let user = { id: 1, username: 'test' };
//
// passport.serializeUser(function(user, done) {
//     done(null, user.id);
// });
//
// passport.deserializeUser(function(id, done) {
//     done(null, user);
// });

passport.use(new LocalStrategy((username, password, done) => {
    executeCypher('auth.cyp', {username:username})
        .then(([result]) => {
            if (password == result.salt)
                done(null, result);
            else
                done(null, false);
        }, (err) => done(null, false));
}));

// koa-passport uses generators which will be deprecated in koa v3, below block should be refactored accordingly
let middleware_auth = async (ctx, next) => {
    await passport.authenticate('local', (user, info, status) => {
        if (user === false) {
            ctx.status = 422;
            ctx.body = {error: info};
        } else {
            ctx.login(user);
            ctx.body = {token: 'JWT' + jwt.sign({id: user.id}, secret)};
        }
    })(ctx, next);
};

passport.use(new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeader(),
        secretOrKey: secret
    }, (jwt_payload, done) => {
        if (!jwt_payload.id) {
            done(new Error('Invalid token'), false);
        }
        else
            executeCypher('jwt.cyp', {id: jwt_payload.id})
                .then(
                    ([result]) => {
                        if (result.exists)
                            done(null, {exists: result.exists});
                        else
                            done(new Error('User does not exist.'), false);
                    },
                    (err) => done(err, false));
    }));

let jwt_authenticate = (ctx, next) => passport.authenticate('jwt', {session: false})(ctx, next)
    .then(
        (result) => {
            console.log(result);
        }, (error) => {
        ctx.status = 401;
        ctx.body = {error: String(error)};
    });

// var FacebookStrategy = require('passport-facebook').Strategy
// passport.use(new FacebookStrategy({
//         clientID: 'your-client-id',
//         clientSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/facebook/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))
//
// var TwitterStrategy = require('passport-twitter').Strategy
// passport.use(new TwitterStrategy({
//         consumerKey: 'your-consumer-key',
//         consumerSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/twitter/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))
//
// var GoogleStrategy = require('passport-google-auth').Strategy
// passport.use(new GoogleStrategy({
//         clientId: 'your-client-id',
//         clientSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/google/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))

export {secret, middleware_auth, jwt_authenticate};
export default passport;