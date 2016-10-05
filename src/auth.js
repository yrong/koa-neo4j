/**
 * Created by keyvan on 8/20/16.
 */

import {KoaPassport} from 'koa-passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import jwt from 'jsonwebtoken';
import {neo4jInt} from './preprocess';

class Authentication {
    constructor(neo4jConnection, {secret, userCypherQueryFile, rolesCypherQueryFile} = {}) {
        this.neo4jConnection = neo4jConnection;
        this.passport = new KoaPassport();

        this.secret = secret;
        this.userQuery = userCypherQueryFile;
        this.rolesQuery = rolesCypherQueryFile;


        this.passport.use(new LocalStrategy((username, password, done) => {
            this.neo4jConnection.executeCypher(this.userQuery, {username: username})
                .then(([user]) => {
                    if (!user || password !== user.password)
                        done(new Error('Invalid username or password'));
                    else {
                        delete user.password;
                        done(null, user);
                    }
                }, done);
        }));

        this.passport.use(new JwtStrategy(
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

        // koa-passport uses generators which will be deprecated in koa v3,
        // below block should be refactored accordingly
        // The author of koa-passport has not considered the use cases of done(err),
        // hence we need to wrap calls in a promise
        this.authenticateLocal = async (ctx, next) => await new Promise(
            (resolve, reject) => this.passport.authenticate('local', resolve)(ctx, next)
                .catch(reject))
            .then((user) => {
                // koa-passport returns false if object is not formatted as {username, password}
                if (!user)
                    ctx.throw('invalid POST data, expected {username, password[, remember]}', 400);
                return Promise.all([Promise.resolve(user), this.getRoles(user)]);
            })
            .then(([user, [{roles} = {}]]) => {
                user.roles = roles;
                const options = {};
                if (!ctx.request.body.remember)
                    options.expiresIn = 20;
                ctx.body = {
                    token: `JWT ${jwt.sign(user, this.secret, options)}`,
                    user: user
                };
            })
            .catch(error => ctx.throw(error.message || String(error), 422));

        this.authenticateJwt = async (ctx, next) => await new Promise((resolve, reject) =>
            this.passport.authenticate('jwt', {session: false}, resolve)(ctx, next)
                .catch(reject))
            // TODO next line connects to DB, token already embodies roles,
            // remove when access token is implemented
            .then(user => this.getRoles(user))
            // koa-passport's ctx.login(user) is just too much hassle, setting ctx.user instead
            .then(([user]) => { ctx.user = user; });
    }

    getRoles(user) {
        return this.neo4jConnection.executeCypher(this.rolesQuery, {id: neo4jInt(user.id)});
    }
}

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

export {Authentication};
