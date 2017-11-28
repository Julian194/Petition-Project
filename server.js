const express = require('express');
const hb = require('express-handlebars');
const bodyParser = require('body-parser');
const csurf = require('csurf');
const myRedisClient = require('./redis.js');
const router = require('./routers/router');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const Store = require('connect-redis')(session);

// --- SET UP EXPRESS APP --- //
const app = express();

// --- SET UP VIEW ENGINE --- //
app.engine('handlebars', hb());
app.set('view engine', 'handlebars');

// --- MIDDLEWARE --- //
app.use(bodyParser.urlencoded({
  extended: false
}));

if(process.env.REDIS_URL){
   store = {
       url: process.env.REDIS_URL
   };
} else {
   store = {
       ttl: 3600, //time to live
       host: 'localhost',
       port: 6379
   };
}

app.use(cookieParser());
app.use(session({
   store: new Store(store),
   resave: true,
   saveUninitialized: true,
   secret: 'secret'
}));
// app.use(cookieParser());
//
// app.use(session({
//     store: new Store({
//         ttl: 3600,
//         host: 'localhost',
//         port: 6379
//     }),
//     resave: false,
//     saveUninitialized: true,
//     secret: 'my super fun secret'
// }));

app.use(csurf());
app.use('/public', express.static(__dirname + '/public'));

// --- ROUTES --- //
app.use(router)

// --- SETTING UP THE PORT --- //
const port = (process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Listening on port ${port}`)
});
