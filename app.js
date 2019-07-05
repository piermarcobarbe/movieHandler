var express = require('express');
var http = require('http');
var app = express();
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
const fileUpload = require('express-fileupload');
var mime = require('mime-types');
const serveIndex = require('serve-index');
var Transmission = require('transmission');


app.use(morgan('tiny', {
    skip: function (req, res) {
        return req.path === "/status" ||
        (req.path.substr(0,4) === "/js/") ||
        (req.path.substr(0,8) === "/images/") ||
        (req.path.substr(0,5) === "/css/") ||
        (req.path === "/");
    }
}));

app.use(fileUpload());
app.use(express.json());


var settings = {
    "torrentFilesDir" : path.join(__dirname, "./public/torrent"),
    "torrentDownloadDir" : path.join(__dirname, "./public/data"),
    "publicTorrentHref" : "/torrent/",
    "publicDataHref" : "/data/"
};

if(!(fs.existsSync(settings.torrentDownloadDir))) fs.mkdirSync(settings.torrentDownloadDir);
if(!(fs.existsSync(settings.torrentFilesDir))) fs.mkdirSync(settings.torrentFilesDir);


// var sample = 'http://releases.ubuntu.com/14.04.1/ubuntu-14.04.1-desktop-amd64.iso.torrent';



var transmission = undefined;

completeResponseWithJSON = function(res, code, json){
    res.status(code);
    res.setHeader('Content-Type', 'application-json');
    if(json) res.end(JSON.stringify(json));
    if(!json) res.end();
};

newErrorJSON = function(err){
    return {"Error" : err};
};

newResultJSON = function(result){
    return {"Result" : result};
};

saveFile = function(file, resCB, errCB){
    var finalFileName = path.join(settings.torrentFilesDir, file.name);
    console.log("Saving file:" + file.name + " in " + finalFileName);

    if(file.mimeType !== "application/x-bittorrent") return errCB("Only torrents files can be saved.");
    console.log(file);
    // console.log(file);

    fs.writeFile(finalFileName, file.data, function (err) {
        if(err){
            if(errCB) errCB(err);
            if(!errCB) throw new Error(err);
        }

        if(resCB) resCB(finalFileName);
        if(!resCB) return finalFileName;

    });
};

checkFolder = function(path, trueCB, falseCB) {
    if(fs.existsSync(path)) {
        if(trueCB) trueCB(path);

    } else {
        if(falseCB) falseCB(path);

    }

    return fs.existsSync(path);
};

saveFiles = function(files, goodCB, badCB){

    var savedFiles = [];

    if(Array.isArray(files.file)){

        for(let i = 0; i < files.file.length; i++){

            saveFile(files.file[i], function (filePath) {
                console.log("Saved " + filePath);
                savedFiles.push(filePath);

                if(savedFiles.length === files.file.length){
                    if(goodCB) goodCB(savedFiles);
                    if(!goodCB) return savedFiles;
                }

            }, function (file) {
                if(badCB) badCB(file);
                if(!badCB) return file;

            });
        }
    } else {
        saveFile(files.file, function (savedFile) {
            if(goodCB) goodCB([savedFile]);
            if(!goodCB) return [savedFiles];

        }, function (unsavedFile) {

            if(badCB) badCB([unsavedFile]);
            if(!badCB) return [unsavedFile];

        });
    }
};

saveUploadedFiles = function(files, goodCB, badCB){

    checkFolder(settings.torrentFilesDir, function (path) {
        saveFiles(files, function (files) {
            console.log("Saved all files!");
            if(goodCB) goodCB(files);
            if(!goodCB) return files;
        }, function (files) {
            console.log("Could not save all files!");
            if(badCB) badCB(files);
            if(!badCB) return files;
        });
    }, function (path) {
        fs.mkdirSync(settings.torrentFilesDir);

        saveFiles(files, function (files) {
            console.log("Saved all files!");
            if(goodCB) goodCB(files);
            if(!goodCB) return files;
        }, function (files) {
            console.log("Could not save all files!");
            if(badCB) badCB(files);
            if(!badCB) return files;
        });

    });

};

addTorrentToTransmission = function(torrentFilePath, goodCB, badCB){

    var options = {
        "download-dir" : settings.torrentDownloadDir
    };

    checkFolder(settings.torrentDownloadDir, function () {
        transmission.addFile(torrentFilePath, options,function (err, arg) {
            console.log(err)
            console.log(arg)

            if(err) return badCB(err);
            return goodCB(arg);

        })
    }, function () {
        fs.mkdirSync(settings.torrentDownloadDir);
        transmission.addFile(torrentFilePath, options, function (err, arg) {
            console.log(err)
            console.log(arg)

            if(err) return badCB(err);
            return goodCB(arg);

        })
    })
};

addTorrentsToTransmission = function(torrentList, goodCB, badCB){

    var result = {
        "success" : [],
        "error" : []
    };


    for(let i = 0; i < torrentList.length; i++){
        addTorrentToTransmission(torrentList[i], function () {
            result.success.push(torrentList[i]);
            if(i === torrentList.length -1){
                if(result.error.length === 0){
                    if(goodCB) goodCB(result);
                    if(!goodCB) return result;
                }
            }
        }, function () {
            result.error.push(torrentList[i]);
            if(i === torrentList.length -1){
                if(badCB) badCB(result);
                if(!badCB) return result;
            }
        });
    }

}



app.post('/remove', function (req, res) {
   // console.log(req);

   if(req.body === null || req.body.torrent_id === null) return completeResponseWithJSON(res, 400, newErrorJSON("No id provided"));

   if(typeof req.body.torrent_id !== "number") return completeResponseWithJSON(res, 400, newErrorJSON("Torrent id must be a number"));


   transmission.remove(req.body.torrent_id, function (err) {
       if(err) return completeResponseWithJSON(res, 400, newErrorJSON(err));
       completeResponseWithJSON(res, 200, {"result" : {"deleted" : [req.body.torrent_id]}})

   }

   )

});


app.post('/upload/torrent', function(req, res) {

    if(!req.files) return completeResponseWithJSON(res, 400, newErrorJSON("No file provided."));

    saveUploadedFiles(req.files, function (files) {
        addTorrentsToTransmission(files, function (result) {
            completeResponseWithJSON(res, 200, result);
        }, function () {

        })
    }, function () {
        completeResponseWithJSON(res, 200, result);
    });

});

app.post('/upload/magnet', function(req, res) {

    console.log(req.body)
    console.log(req.magnet_link);

    if(!req.body) return completeResponseWithJSON(res, 400, newErrorJSON("No magnet provided."));
    if(!req.body.magnet_link) return completeResponseWithJSON(res, 400, newErrorJSON("No magnet provided."));


    var options = {
        "download-dir" : settings.torrentDownloadDir
    }

    transmission.addUrl(req.body.magnet_link, options, function (err, done) {
        if(err) return completeResponseWithJSON(res, 500, newErrorJSON(err));
        completeResponseWithJSON(res, 200, done);
    })

});

app.get("/status", function (req, res) {
    if(transmission === undefined) return completeResponseWithJSON(res, 500, newErrorJSON("Transmission setup incomplete."));
    transmission.sessionStats(function (err, args) {
        if(err) return completeResponseWithJSON(res, 500, err);
        transmission.get( function (err, torrentsStatus) {
            if(err) return completeResponseWithJSON(res, 500, newErrorJSON(err) );
            args.torrentsStatus = torrentsStatus;
            transmission.session(function (err, arg) {
                if(err) return CompleteResponseWithJSON(res, 500, newErrorJSON(err));
                args.session = arg;
                completeResponseWithJSON(res, 200, args);
            })
        })
    });
});


app.post("/setup", function (req, res) {

    // console.log(req.body);


    let newSettings = {};
    newSettings.username = req.body.user;
    newSettings.password = req.body.passwd;
    newSettings.host = "localhost";
    newSettings.port = req.body.port;

    transmission = new Transmission(newSettings);

    transmission.sessionStats(function (err, args) {
        if(err) return completeResponseWithJSON(res, 401, newErrorJSON(err));
        return completeResponseWithJSON(res, 200, newResultJSON("Authenticated"));
    });
});

app.post("/disconnect", function (req, res) {

    transmission = new Transmission();
    return completeResponseWithJSON(res, 200, newResultJSON("Disconnected"));

});

app.get("/sources/*", function (req, res) {
    if (!fs.existsSync(settings.torrentDownloadDir)) return completeResponseWithJSON(res, 404, newErrorJSON(settings.torrentDownloadDir + " does not exist."));
    let _path = req.path.split("/sources/")[1];
    // console.log("_path: " + _path);
    // if(_path === "") return completeResponseWithJSON(res, 404, newErrorJSON("Cannot find sources for requested path." ));
    _path = decodeURI(_path);
    let pathToRead = path.join(settings.torrentDownloadDir, _path);
    // console.log("pTR:" + pathToRead);
    // console.log("resolved path: " + path.resolve( "/video", _path , ":filename"));
    // app.get(path.resolve( "/video", _path , ":filename") ,videoStream({ dir: path.resolve(pathToRead)}));
    // console.log(req.path);
    fs.readdir(pathToRead, (err, files) => {
        if(err) return completeResponseWithJSON(res, 500, newErrorJSON(err));
        var data = { "files" : [], "directories" : [] };
        files.forEach(file => {
            var target = path.join(pathToRead, file);
            if(fs.lstatSync(target).isFile()) {
                let _data = {};
                _data.file = file;
                _data.type = mime.lookup(file);
                // let href = path.join(settings.publicDataHref, _path);
                let href = path.join(_path, file);
                _data.href = href;
                data.files.push(_data);
            }
            if(fs.lstatSync(target).isDirectory()) data['directories'].push(file);

        });

        completeResponseWithJSON(res, 200, data);

    });

});



// app.get('/video/:filename' ,videoStream({ dir: path.resolve(settings.torrentDownloadDir)}));
app.get('/video/*', function(req, res) {
    // console.log(req.params)
    const filePath = path.resolve(settings.torrentDownloadDir, req.params[0]);
    console.log(filePath);
    const stat = fs.statSync(filePath);

    if(stat.isDirectory()) return completeResponseWithJSON(res, 400, newErrorJSON("Cannot stream a directory."));
    const fileSize = stat.size;
    const range = req.headers.range;
    const mt = mime.lookup(filePath);
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1
        const chunksize = (end-start)+1;
        const file = fs.createReadStream(filePath, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Transfer-Encoding': 'chunked',
            'Content-Length': chunksize,
            'Content-Type': mt

        }
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Transfer-Encoding': 'chunked',
            'Content-Length': fileSize,
            'Content-Type': `video/mp4`


        }
        res.writeHead(200, head)
        fs.createReadStream(filePath).pipe(res)
    }
});

app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname, "public/")));

// console.log(path.join(__dirname, settings.torrentFilesDir));

app.use(settings.publicTorrentHref, express.static( settings.torrentFilesDir));
app.use(settings.publicTorrentHref, serveIndex(settings.torrentFilesDir, { 'icons': true }));


app.use(settings.publicDataHref, express.static(settings.torrentDownloadDir));
app.use(settings.publicDataHref, serveIndex(settings.torrentDownloadDir, { 'icons': true }));




app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});