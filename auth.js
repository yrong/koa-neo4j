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
            if (!result || password != result.salt)
                done(new Error('Invalid username or password'));
            else
                done(null, result);
        }, done);
}));

// koa-passport uses generators which will be deprecated in koa v3, below block should be refactored accordingly
// The author of koa-passport has not considered the use cases of done(err), hence we need to wrap calls in a promise
let middleware_auth = async (ctx, next) => {
    await new Promise((resolve, reject) => passport.authenticate('local', (user) => {
        ctx.login(user);
        ctx.body = {token: 'JWT ' + jwt.sign({id: user.id}, secret)};
        resolve();
    })(ctx, next)
        .then(resolve, reject))
        .catch((error) => {
            ctx.status = 422;
            ctx.body = {error: String(error)};
        });
};

passport.use(new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeader(),
        secretOrKey: secret
    }, (jwt_payload, done) => {
        if (!jwt_payload.id) {
            done(new Error('Invalid token'));
        }
        else
            executeCypher('jwt.cyp', {id: jwt_payload.id})
                .then(
                    ([result]) => {
                        if (result.exists)
                            done(null, true);
                        else
                            done(new Error('User provided in the token does not exist'));
                    },
                    done);
    }));

let jwt_authenticate = (ctx, next) => new Promise((resolve, reject) => passport.authenticate('jwt',
    {session: false}, resolve)(ctx, next)
        .then(resolve, reject))
        .catch((error) => {
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

export {middleware_auth, jwt_authenticate};
export default passport;