var Client = require('node-torrent');
var client = new Client({logLevel: 'DEBUG'});
var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');

console.log(path.join(__dirname, "public/"))
app.use('/', express.static(path.join(__dirname, "public/")));
//
// app.post('/rpc', function (req, res) {
//     console.log(req.headers);
//     console.log(req.body);
//
//     console.log("-------------------");
//
//     res.sendStatus(200);
//     res.end();
// });

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});