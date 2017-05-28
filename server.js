'use strict';

//Make environmental variables available
require('dotenv').config();

const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const pg = require('pg');
const path = require('path');
const Poloniex = require('poloniex-api-node');
const pool = require('./lib/db');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const authCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.NODE_ENV_AUTH_JWKS_URL
    }),
    audience: process.env.NODE_ENV_AUTH_AUDIENCE,
    issuer: process.env.NODE_ENV_AUTH_ISSUER,
    algorithms: ['RS256']
});

/*

    Database

 */

//to run a query we just pass it to the pool
//after we're done nothing has to be taken care of
//we don't have to return any client to the pool or close a connection
pool.query('SELECT $1::int AS number', ['2'], function(err, res) {
    if(err) {
        return console.error('error running query', err);
    }

    console.log('number:', res.rows[0].number);
});

/*

    Poloniex

 */

var autobahn = require('autobahn');
var wsuri = "wss://api.poloniex.com";
var connection = new autobahn.Connection({
    url: wsuri,
    realm: "realm1"
});

connection.onopen = function (session) {
    function marketEvent (args,kwargs) {
        console.log(args);
    }
    function tickerEvent (args,kwargs) {
        console.log(args);
    }
    function trollboxEvent (args,kwargs) {
        console.log(args);
    }
    // session.subscribe('BTC_XMR', marketEvent);
    // session.subscribe('ticker', tickerEvent);
    // session.subscribe('trollbox', trollboxEvent);
}

connection.onclose = function () {
    console.log("Websocket connection closed");
}

connection.open();


/*

    User API

 */

let poloniex = new Poloniex(process.env.NODE_ENV_POLONIEX_KEY, process.env.NODE_ENV_POLONIEX_SECRET, { socketTimeout: 15000 });

app.get('/api/ticker', (req,res) => {
    console.log("Ticker request");
    poloniex.returnTicker(function(err, data) {
        res.json(data);
    });

});

app.get('/api/currencies', (req,res) => {
    console.log("Currencies request");
    poloniex.returnCurrencies(function (err, data) {
        res.json(data);
    });
});

app.get('/api/trades/:pair/:start/:end' , (req,res) => {
    console.log("Trades request: " + req.params.pair);
    poloniex.returnMyTradeHistory(req.params.pair, req.params.start, req.query.end, function (err, data) {
        res.json(data);
    });
});

app.get('/api/chart/:pair/:period/:start/:end', (req,res) => {
    console.log("Chart request: " + req.params.pair);
    poloniex.returnChartData(req.params.pair, req.params.period, req.params.start, req.query.end, function (err, data) {
        res.json(data);
    });
});

app.get('/api/sessions', authCheck, (req,res) => {

});


app.listen(3001);
console.log('Welcome to mBot-API, listening on localhost:3001');