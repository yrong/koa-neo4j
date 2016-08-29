/**
 * Created by keyvan on 8/20/16.
 */

import {KoaPassport} from 'koa-passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import jwt from 'jsonwebtoken';
import {executeCypher, neo4jInt} from './data';


const passport = new KoaPassport();
let secretPhrase;
let userQuery;
let rolesQuery;

const useAuthentication = ({secret, userCypherQueryFile, rolesCypherQueryFile} = {}) => {
    secretPhrase = secret;
    userQuery = userCypherQueryFile;
    rolesQuery = rolesCypherQueryFile;
    passport.use(new LocalStrategy((username, password, done) => {
        executeCypher(userQuery, {username: username})
            .then(([user]) => {
                if (!user || password !== user.password_hash)
                    done(new Error('Invalid username or password'));
                else {
                    delete user.password_hash;
                    done(null, user);
                }
            }, done);
    }));

    passport.use(new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeader(),
            secretOrKey: secret
        }, (user, done) => {
            // Check whether payload is user
            if (!user.id)
                done(new Error('Invalid token'));
            else
                done(null, user);
        }));
};


// koa-passport uses generators which will be deprecated in koa v3, below block should be refactored
// accordingly
// The author of koa-passport has not considered the use cases of done(err), hence we need to wrap
// calls in a promise
const authenticateLocal = async (ctx, next) => await new Promise(
    (resolve, reject) => passport.authenticate('local', resolve)(ctx, next)
        .catch(reject))
    .then((user) => {
        ctx.body = {token: `JWT ${jwt.sign(user, secretPhrase)}`};
    })
    .catch((error) => {
        ctx.status = 422;
        ctx.body = {error: String(error)};
    });

const authenticateJwt = async (ctx, next) => await new Promise(
    (resolve, reject) => passport.authenticate('jwt', {session: false}, resolve)(ctx, next)
        .catch(reject))
    .then(user => executeCypher(rolesQuery, {id: neo4jInt(user.id)}))
    // koa-passport's ctx.login(user) is just too much hassle, setting ctx.user instead
    .then(([user]) => { console.log(user);ctx.user = user; })
    .catch((error) => {
        ctx.status = 401;
        ctx.body = {error: error.fields ? String(error.fields[0]) : String(error)};
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

export {useAuthentication, authenticateLocal, authenticateJwt};
export default passport;
