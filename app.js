var express = require('express');
var http = require('http');
var app = express();
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
const fileUpload = require('express-fileupload');
const serveIndex = require('serve-index');
var Transmission = require('transmission');

app.use(morgan('tiny', {
    skip: function (req, res) { return req.path === "/status"; }
}));

app.use(fileUpload());
app.use(express.json());


var settings = {
    "torrentFilesDir" : path.join(__dirname, "./public/torrent"),
    "torrentDownloadDir" : path.join(__dirname, "./public/data")
};


// var sample = 'http://releases.ubuntu.com/14.04.1/ubuntu-14.04.1-desktop-amd64.iso.torrent';



transmission = new Transmission({
    "host" : "localhost",
    "port" : 9091
});


saveFile = function(file, resCB, errCB){
    var finalFileName = path.join(settings.torrentFilesDir, file.name);
    console.log("Saving file:" + file.name + " in " + finalFileName);

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
    }

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

completeResponseWithJSON = function(res, code, json){
    res.status(code);
    res.setHeader('Content-Type', 'application-json');
    if(json) res.end(JSON.stringify(json));
    if(!json) res.end();
}

newErrorJSON = function(err){
    return {"Error" : err};
};

app.post('/remove', function (req, res) {
   console.log(req);

   if(req.body === null || req.body.torrent_id === null){
       completeResponseWithJSON(res, 400, newErrorJSON("No id provided"));
   }

   transmission.remove(req.body.torrent_id, function (err) {
       if(err) return completeResponseWithJSON(res, 400, newErrorJSON(err));
       completeResponseWithJSON(res, 200, null)

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
    transmission.sessionStats(function (err, args) {
        if(err) return completeResponseWithJSON(res, 500, err);

        // console.log(args);

        transmission.get( function (err, torrentsStatus) {
            if(err) return completeResponseWithJSON(res, 500, newErrorJSON(err) );
            args.torrentsStatus = torrentsStatus;
            completeResponseWithJSON(res, 200, args)
        })
    });
});

function get(hash, cb) {
    transmission.get(hash, function(err, result) {
        if (err) {
            throw err;
        }
        cb(null, result.torrents[0]);
    });
}

function watch(hash) {
    get(hash, function(err, torrent) {
        if (err) {
            throw err;
        }

        var downloadedEver = 0;
        var WatchBar = new ProgressBar('  downloading [:bar] :percent :etas', {
            complete : '=',
            incomplete : ' ',
            width : 35,
            total : torrent.sizeWhenDone
        });

        function tick(err, torrent) {
            if (err) {
                throw err;
            }
            var downloaded = torrent.downloadedEver - downloadedEver;
            downloadedEver = torrent.downloadedEver;
            WatchBar.tick(downloaded);

            if (torrent.sizeWhenDone === torrent.downloadedEver) {
                return remove(hash);
            }
            setTimeout(function() {
                get(hash, tick);
            }, 1000);
        }

        get(hash, tick);
    });
}

function remove(hash) {
    transmission.remove(hash, function(err) {
        if (err) {
            throw err;
        }
        console.log('torrent was removed');
    });
}

//
// transmission.addUrl(sample, {
//     //options
// }, function(err, result) {
//     if (err) {
//         return console.log(err)
//     }
//     var hash = result.hashString;
//     watch(hash);
// });

app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, "public/")));

app.use('/torrent/', express.static(path.join(__dirname, settings.torrentFilesDir)));
app.use('/torrent/', serveIndex(path.join(__dirname, settings.torrentFilesDir), { 'icons': true }));



app.use('/data/', express.static(path.join(__dirname, settings.torrentDownloadDir)));
app.use('/data/', serveIndex(path.join(__dirname, settings.torrentDownloadDir), { 'icons': true }));




app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});