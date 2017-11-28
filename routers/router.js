const express = require('express');
const router  = express.Router();
const session = require('express-session');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const spicedPg = require('spiced-pg');
const myRedisClient = require('../redis.js');
const Store = require('connect-redis')(session);
const bcrypt = require('../bcrypt.js');
const dbDetails = require('../config/db.json');
const db = spicedPg(process.env.DATABASE_URL || dbDetails.details);

//********* HOMEPAGE *********//

router.get('/', (req, res) => {
  res.redirect('/petition')
});

router.route('/petition')

  .get((req, res) => {
  if (!req.session.user) {
    res.redirect('/register')
  } else {
      if(req.session.user.signatureId){
        res.redirect("/petition/signed")
      } else{
        res.render('petition', {
          csrfToken: req.csrfToken(),
          layout: 'main',
          first: req.session.user.first,
          last: req.session.user.last
        })
      }
    }
  })

  .post((req, res) => {
    const signature = req.body.signature;
    const user_id = req.session.user.id;

    const q = `INSERT INTO signatures (signature, user_id) VALUES ($1,$2) RETURNING id;`
    const params = [signature, user_id]

    db.query(q, params)
      .then((results) => {
        req.session.user.signatureId = user_id
        res.redirect('/petition/signed')
      }).catch(e => {
        console.log(e);
      });
  });

//********* THANK YOU PAGE *********//

router.get('/petition/signed', (req, res) => {
  if (!req.session.user) {
    res.redirect('/register')
  } else {
    const q = `SELECT signature FROM signatures WHERE user_id = $1;`
    const qNum = `SELECT * FROM signatures`
    const id = [req.session.user.signatureId]
    let count
    db.query(qNum).then((result) => {count= result.rowCount})
    db.query(q, id)
      .then((result) => {
          res.render('thankyou', {
            csrfToken: req.csrfToken(),
            layout: 'main',
            count: count,
            imgURL: result.rows[0].signature,
            user: req.session.user
          })
      }).catch( e =>
        console.log(e))
    }
})

//********* LIST OF SIGNERS *********//

router.get('/petition/signers', (req, res) => {
  if (!req.session.user) {
    res.redirect('/register')
  } else {

    const q = `SELECT users.first AS first_name, users.last AS last_name, user_profiles.age, user_profiles.city,user_profiles.url
               FROM users
               JOIN user_profiles
               ON users.id = user_profiles.user_id
               JOIN signatures
               ON users.id = signatures.user_id`

    myRedisClient.get('signatures').then((signatures) => {
      let redisSigners = JSON.parse(signatures)
      if (redisSigners) {
        res.render('signers', {
          csrfToken: req.csrfToken(),
          layout: 'main',
          name: redisSigners,
          user: req.session.user
        })
      }else {
        return db.query(q).then((signers) => {
          myRedisClient.setex('signatures',30, JSON.stringify(signers.rows))
            res.render('signers', {
            csrfToken: req.csrfToken(),
            layout: 'main',
            name: signers.rows,
            user: req.session.user
          })
        })
      }
    })
  }
});

//********* LIST OF SIGNERS SORTED BY CITIES *********//

router.get('/petition/signers/:city', (req,res) => {
  const city = [req.params.city];
  const q = `SELECT users.first AS first_name, users.last AS last_name, user_profiles.age, user_profiles.url
             FROM users
             JOIN signatures
             ON users.id = signatures.user_id
             JOIN user_profiles
             ON users.id = user_profiles.user_id
             WHERE user_profiles.city = $1`
  db.query(q,city)
    .then((result) => {
      res.render('signers', {
        csrfToken: req.csrfToken(),
        layout: 'main',
        name: result.rows,
        user: req.session.user
      })
    })
})

//********* USER PROFILE *********//

router.route('/profile')

  .get((req,res) => {
    res.render('profile', {
      csrfToken: req.csrfToken(),
      layout: 'main'
    })
  })

  .post((req,res) => {
    const age = req.body.age;
    const city = req.body.city;
    let url = req.body.url;
    const user_id = req.session.user.id;

    if(url.startsWith("https") || !url){
      console.log("no url");
    } else {
      url = 'https://'+req.body.url
    }

    const q = "INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1,$2,$3,$4)"
    const params = [user_id, age, city, url];
    db.query(q, params)
      .then(() => { res.redirect('/petition')
    })
  })


router.route('/profile/edit')

  .get((req,res) => {
    const currentUser = [req.session.user.id]
    const q = `SELECT users.first AS first_name, users.last AS last_name, users.email, user_profiles.age, user_profiles.city, user_profiles.url
               FROM users
               JOIN user_profiles
               ON users.id = user_profiles.user_id
               WHERE users.id = $1`

    db.query(q, currentUser).then((result) => {
      res.render('editprofile', {
        csrfToken: req.csrfToken(),
        layout: 'main',
        data: result.rows[0],
        user: req.session.user
      })
    })
  })

  .post((req,res) => {
    const id = req.session.user.id;
    const {first,last,email,password,age,city,url} = req.body
    const qUsers = `UPDATE users SET first = $1, last = $2, email = $3  WHERE users.id = $4`
    const paramsUsers = [first,last,email,id]
    const qUserProfiles = `UPDATE user_profiles SET age = $1, city = $2, url = $3  WHERE user_profiles.user_id = $4`
    const paramsUserProfiles = [age,city,url,id]
    const qPassword = `UPDATE users SET password = $1 WHERE users.id = $2`

    if (!password){
      console.log("Password did not change");
    } else {
      bcrypt.hashPassword(password)
        .then((hash) => {
          db.query(qPassword, [hash, id])
        })
        .then((result) => {
          console.log('Changed Password');
        })
      }

    db.query(qUsers, paramsUsers).then(
      () => {
        console.log("Users Table upated")
    })
    db.query(qUserProfiles, paramsUserProfiles).then(
      () => {
      console.log("User Profile Table upated")
      req.session.user.first= first
      req.session.user.last = last
      res.redirect('/petition/signed')
    })
  })

router.post('/deleteaccount', (req,res) => {
  const id = [req.session.user.id]
  Promise.all([
    db.query('DELETE FROM user_profiles WHERE user_id = $1', id),
    db.query('DELETE FROM signatures WHERE user_id = $1', id),
    db.query('DELETE FROM users WHERE id = $1', id)
  ]).then(() => {
    req.session.destroy(() => {
      res.redirect('/register');
    })
  })
})

router.post('/deletesignature', (req,res) => {
  const q = `DELETE FROM signatures WHERE user_id = $1 `
  const id = [req.session.user.id]
  db.query(q,id).then(() => {
    console.log("Deleted signature");
    delete req.session.user.signatureId
    res.redirect('/petition')
  })
})

//********* LOGIN/LOGOUT/REGISTER *********//

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/register');
  })
})

router.route('/login')

  .get((req, res) => {
    if (req.session.user) {
      res.redirect('/petition')
    } else {
      res.render('login', {
        csrfToken: req.csrfToken(),
        layout: 'main2'
      })
    }
  })

  .post((req, res) => {
    if (!req.body.email || !req.body.password) {
      res.render('login', {
        csrfToken: req.csrfToken(),
        layout: 'main2',
        error: "Please fill out the required input fields"
      })
    } else {
      const email = [req.body.email]
      const q = 'SELECT * FROM users WHERE email = $1'
      db.query(q, email)
        .then((result) => {
          const data = result.rows[0];
          if (data) {
            bcrypt.checkPassword(req.body.password, data.password)
              .then((doesMatch) => {
                if (doesMatch) {
                  req.session.user = {
                    first: data.first,
                    last: data.last,
                    id: data.id
                  }
                  db.query("SELECT id FROM signatures WHERE user_id = $1", [data.id])
                    .then((result) => {
                      if(result.rows.length){
                        req.session.user.signatureId = data.id
                        res.redirect('/petition/signed')
                      } else {
                        res.redirect('/')
                      }
                    })
                } else {
                  res.render('login', {
                    csrfToken: req.csrfToken(),
                    layout: 'main2',
                    error: "The password you entered was not correct"
                  })
                }
              })
          } else {
            res.render('login', {
              csrfToken: req.csrfToken(),
              layout: 'main2',
              error: "The email you entered was not correct"
            })
          }
        })
      }
  })

router.route('/register')

  .get((req, res) => {
    res.render('register', {
      csrfToken: req.csrfToken(),
      layout: 'main2'
    })
  })

  .post((req, res) => {
    if (!req.body.first || !req.body.last || !req.body.email || !req.body.password) {
      res.render('register', {
        csrfToken: req.csrfToken(),
        layout: 'main2',
        error: "Please fill out the required input fields"
      })
    }
    else {
      const email = [req.body.email]
      const q = `SELECT * FROM users WHERE users.email=$1`

      db.query(q,email).then((result) => {
        if (result.rows[0]){
          res.render('register', {
            csrfToken: req.csrfToken(),
            layout: 'main2',
            error: "This email address is alreay taken. Please choose another one."
          })
        } else{


      const {first,last,email} = req.body
      const q = `INSERT INTO users (first, last, email, password) VALUES ($1,$2,$3,$4) RETURNING id;`

      bcrypt.hashPassword(req.body.password)
        .then((hash) => {
          db.query(q, [first, last, email, hash]).then(
            (result) => {
              req.session.user = {
                first: first,
                last: last,
                id: result.rows[0].id,
              }
              res.redirect('/profile')
            })
        })
      }
    })
  }
  })


module.exports = router;
