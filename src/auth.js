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

        this.passport.use(
            new LocalStrategy((username, password, done) => this.getUser(username, password)
                .then(user => done(null, user))
                .catch(done))
        );

        // koa-passport uses generators which will be deprecated in koa v3,
        // below block should be refactored accordingly
        // The author of koa-passport has not considered the use cases of done(err),
        // hence we need to wrap calls in a promise
        this.authenticateLocal = (ctx, next) => new Promise(
            (resolve, reject) => this.passport.authenticate('local', resolve)(ctx, () => {})
                .catch(reject))
            .then(user => {
                // koa-passport returns false if object is not formatted as {username, password}
                if (user === false)
                    throw new Error('invalid POST data, expected {username, password[, remember]}');
                return user;
            })
            .catch(error => ctx.throw(400, error))
            .then(user => {
                ctx.body = this.getToken(user, ctx.request.body.remember)
            })
            .catch(error => ctx.throw(422, error))
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
            // TODO next line connects to DB, token already embodies roles,
            // change when access token is implemented
            .then(this.appendRoles)
            // koa-passport's ctx.login(user) is just too much hassle, setting ctx.user instead
            .then(user => { ctx.user = user; })
            .then(next);



        this.getUser = (username, password) => {
            return this.neo4jConnection.executeCypher(this.userQuery, {username: username})
                .then(response => {
                    const user = response[0];
                    if (!user)
                        throw new Error('invalid username or password');
                    const passwordsMatch = this.passwordMatches ?
                        this.passwordMatches(password, user.password)
                        : password === user.password;
                    if (!passwordsMatch)
                        throw new Error('invalid username or password');
                    delete user.password;
                    return user;
                })
                .then(this.appendRoles);
        };

        this.appendRoles = user => {
            return this.neo4jConnection.executeCypher(
                this.rolesQuery || 'MATCH (user) WHERE id(user) = {id} RETURN {roles: labels(user)}',
                {id: neo4jInt(user.id)}, !this.rolesQuery)
                .then(response => {
                    let [{roles}] = response;
                    if (!roles)
                        throw new Error(
                            "'rolesCypherQueryFile' returned an invalid object, expected { roles }");
                    roles = roles.map(role => role.toLowerCase());
                    user.roles = roles;
                    return user;
                });
        };

        this.getToken = (user, remember) => {
            const options = {};
            if (!remember)
                options.expiresIn = this.tokenExpirationInterval;
            return {
                token: `JWT ${jwt.sign(user, this.secret, options)}`,
                user: user
            };
        };

        this.login = (username, password, remember) => {
            return this.getUser(username, password)
                .then(user => this.getToken(user, remember));
        };
    }
}

export {Authentication};
