const assert = require('chai').assert
const supertest = require('supertest')
const logWrapper = require('log4js-wrapper-advanced')

const KoaNeo4jApp = require('../dist/index').default

describe("koa-neo4j-transaction", () => {
    let app,request

    const wait = (timeout=10)=> {
        return new Promise((resolve, reject) => {
            setTimeout(resolve,timeout)
        })
    }

    before(async () => {
        logWrapper.initialize({"defaultLevel":"trace"})
        app = new KoaNeo4jApp({
            neo4j: {
                boltUrl: `bolt://${process.env['NEO4J_HOST']||'localhost'}`,
                user: process.env['NEO4J_USER']||'neo4j',
                password: process.env['NEO4J_PASSWD']||'neo4j'
            }
        })
        await app.neo4jConnection.initialized
        app.defineAPI({
            method: 'POST',
            route: '/transaction/fail',
            globalTransaction: true,
            postProcess: () => Promise.reject('operation not successful')
        })
        app.defineAPI({
            method: 'POST',
            route: '/transaction/success',
            globalTransaction: true
        })
        app.defineAPI({
            method: 'POST',
            route: '/none_transaction'
        })
        app.server.listen()
    })

    after(async () => {
        await app.server.close()
    })

    beforeEach(async() => {
        request = supertest(app.server)
    })

    it("globalTransaction test", async() => {
        let response = await request.post(`/transaction/success`).send({cypher:["match (n:Test) delete n"]})
        assert.equal(response.statusCode,200)
        response = await request.post(`/transaction/success`).send({cypher:"create (n:Test) set n.test=1"})
        assert.equal(response.statusCode,200)
        response = await request.post(`/transaction/fail`).send({cypher:["create (n:Test) set n.test=1"]})
        assert.equal(response.statusCode,500)
        response = await request.post(`/none_transaction`).send({cypher:"match (n:Test) return n"})
        assert.equal(response.body.length,1)
    });
})
