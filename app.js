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
    let username = req.body.username;
    let password = req.body.password;
    let accessToken = await auth.signInWithAmplify(username, password);
    res.cookie('s3-multitenancy-cookie', accessToken);
    // res.sendFile(path.join(__dirname, 'public/search.html'));
    res.redirect('./search');
});

app.get('/js', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/scripts.js'));
  });  

app.post('/api', (req, res) => {
    res.send("Hello World!")
});

app.get('/search', function(req, res) {
    console.log("Cookie: " + JSON.stringify(req.cookies))
    res.sendFile(path.join(__dirname, 'public/search.html')); 
});

app.post('/search', function(req, res) {
    console.log("Cookie: " + req.cookies) 
    // inspect cookie - get access token
    // crack open jwt token and verify
    // get tenantID from token
    // does token also need site claims or is tenant isolation sufficient?
    // use tenantID to lookup matching STS role
    // query S3 and show results
    // create presigned url for selected object and redirect user to it

});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});