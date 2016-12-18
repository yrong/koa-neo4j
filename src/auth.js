/**
 * Created by keyvan on 8/20/16.
 */

import {KoaPassport} from 'koa-passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import jwt from 'jsonwebtoken';
import {neo4jInt} from './preprocess';

class Authentication {
    constructor(neo4jConnection, {secret, passwordMatches, tokenExpirationInterval,
        userCypherQueryFile, rolesCypherQueryFile} = {}) {
        this.neo4jConnection = neo4jConnection;
        this.passport = new KoaPassport();

        this.secret = secret;
        this.passwordMatches = passwordMatches;
        this.tokenExpirationInterval = tokenExpirationInterval || '1h';
        this.userQuery = userCypherQueryFile;
        this.rolesQuery = rolesCypherQueryFile;

        this.passport.use(new LocalStrategy((username, password, done) => {
            this.neo4jConnection.executeCypher(this.userQuery, {username: username})
                .then(response => {
                    const user = response[0];
                    if (!user)
                        done(new Error('invalid username or password'));
                    else {
                        const passwordsMatch = this.passwordMatches ?
                            this.passwordMatches(password, user.password)
                            : password === user.password;
                        if (!passwordsMatch)
                            done(new Error('invalid username or password'));
                        else {
                            delete user.password;
                            done(null, user);
                        }
                    }
                }, done);
        }));

        // koa-passport uses generators which will be deprecated in koa v3,
        // below block should be refactored accordingly
        // The author of koa-passport has not considered the use cases of done(err),
        // hence we need to wrap calls in a promise
        this.authenticateLocal = (ctx, next) => new Promise(
            (resolve, reject) => this.passport.authenticate('local', resolve)(ctx, () => {})
                .catch(reject))
            .then(user => {
                // koa-passport returns false if object is not formatted as {username, password}
                if (!user)
                    ctx.throw('invalid POST data, expected {username, password[, remember]}', 400);
                return user;
            })
            .then(user => this.loginRespond(user, ctx))
            .catch(error => ctx.throw(error, 422))
            .then(next);

        this.passport.use(new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeader(),
                secretOrKey: secret
            }, (user, done) => {
                // Check whether payload is user
                if (!user.id)
                    done(new Error('invalid token'));
                else
                    done(null, user);
            }));

        this.authenticateJwt = (ctx, next) => new Promise((resolve, reject) =>
            this.passport.authenticate('jwt', {session: false}, resolve)(ctx, () => {})
                .catch(reject))
            .then(user => this.login(user, ctx))
            .then(next);
    }

    getRoles(user) {
        return this.neo4jConnection.executeCypher(
            this.rolesQuery || 'MATCH (user) WHERE id(user) = {id} RETURN {roles: labels(user)}',
            {id: neo4jInt(user.id)}, !this.rolesQuery)
            .then(response => {
                const [{roles}] = response;
                if (!roles)
                    throw new Error(
                        "'rolesCypherQueryFile' returned an invalid object, expected { roles }");
                return roles.map(role => role.toLowerCase())
            });
    }

    login(user, ctx) {
        // TODO next line connects to DB, token already embodies roles,
        // remove when access token is implemented
        return Promise.all([user, this.getRoles(user)])
            .then(([user, roles]) => {
                user.roles = roles;
                return user;
            })
            // koa-passport's ctx.login(user) is just too much hassle, setting ctx.user instead
            .then(user => { ctx.user = user; return user; })
    }

    loginRespond(user, ctx) {
        return Promise.all([user, this.getRoles(user)])
            .then(([user, roles]) => {
                user.roles = roles;
                const options = {};
                if (!ctx.request.body.remember)
                    options.expiresIn = this.tokenExpirationInterval;
                ctx.body = {
                    token: `JWT ${jwt.sign(user, this.secret, options)}`,
                    user: user
                };
                return user;
            })
    }
}

export {Authentication};
