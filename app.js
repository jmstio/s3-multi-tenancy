const express = require('express');
const res = require('express/lib/response');
const app = express();
const port = 3000;
const path = require('path');
const { nextTick } = require('process');
const auth = require('./auth');
const cookieParser = require('cookie-parser');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.post('/signin', async (req, res) => {
    // Insert Login Code Here
    //console.log("*** REQUEST *** :" + JSON.stringify(req.body))
    let username = req.body.username;
    let password = req.body.password;
    let accessToken = await auth.signInWithAmplify(username, password);
    // console.log("*** AUTHD USER ***" + authenticatedUser);
    res.cookie('s3-multitenancy-cookie', accessToken);
    res.sendFile(path.join(__dirname, 'public/search.html'));
    //res.send(`Username: ${username} Password: ${password}`);
});

app.get('/js', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/scripts.js'));
  });  

app.post('/api', (req, res) => {
    res.send("Hello World!")
});

// app.get('/search', function(req, res) {
//     res.sendFile(path.join(__dirname, 'public/search.html'));
// });

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});