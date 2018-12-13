var APIrequest = require('request');
var fs = require('fs');
var sizeOf = require('image-size');
var url = require('url');
var http = require('http');

// create database
// Globals
var sqlite3 = require('sqlite3').verbose();  // use sqlite
// makes the object that represents the database in our code
var db = new sqlite3.Database('PhotoQ.db');

// prevent denial-of-service attacks against the TA's lab machine!
// http.globalAgent.maxSockets = 1;

// Initialize table.
// If the table already exists, causes an error.
// Fix the error by removing or renaming PhotoQ.db
var cmdStr = 'CREATE TABLE photoTags (idNum INTEGER UNIQUE NOT NULL PRIMARY KEY, fileName TEXT, width INTEGER, height INTEGER, location TEXT, tags TEXT)';
db.run(cmdStr,tableCreationCallback);

function tableCreationCallback(err) {
    if (err) {
        console.log('Table creation error',err);
    } else {
    console.log('Database created');
    // db.close();
    }
}


console.log('Reading Json \n');
var content = fs.readFileSync('photoList.json');
var photoList = JSON.parse(content).photoURLs;

// console.log(photoList[778]);

var APIrequestObject = {"requests": [{"image": {"source": {"imageUri": "_IMGURL"}},
                                      "features": [{ "type": "LABEL_DETECTION" },
                                                   { "type": "LANDMARK_DETECTION"}]}]};

var GCVUrl = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyD6pTNnS9XwFQg30SPtTDWpHOaquwxkXJQ';

var queue = [];

function annotateImage(index, imgURL) {
    // The code that makes a request to the API
    // Uses the Node request module, which packs up and sends off
    // an HTTP message containing the request to the API server
    var APIReqObj = APIrequestObject;
    APIReqObj.requests[0].image.source.imageUri = imgURL;

    APIrequest(
        { // HTTP header stuff
            url: GCVUrl,
            method: "POST",
            headers: {"content-type": "application/json"},
        // will turn the given object into JSON
            json: APIReqObj
        },
        // callback function for API request
            APIcallback);

    // callback function, called when data is received from API
    function APIcallback(err, APIresponse, body) {
        if ((err) || (APIresponse.statusCode != 200)) {
            console.log("Got API error");
            console.log(body);
        }
        else {
            // APIresponseJSON = body.responses[0];
            getSize(index, imgURL, body.responses[0]);
            // console.log(APIresponseJSON);
            // console.log(APIresponseJSON.landmarkAnnotations[0].locations);
        }
    } // end callback function
} // end annotateImage


function getSize(index, imgURL, APIresponseJSON) {
    // var name = imgURL.split('/')[imgURL.split('/').length-1];
    var options = url.parse(imgURL);

    // call http get
    http.get(options, function (response) {
        var chunks = [];
        response.on('data', function (chunk) {
            chunks.push(chunk);
        }).on('end', function() {
            var buffer = Buffer.concat(chunks);
            var dimensions = sizeOf(buffer);
            insertPhoto(index, decodeURIComponent(imgURL.replace('http://lotus.idav.ucdavis.edu/public/ecs162/UNESCO/', '')),
                        dimensions, APIresponseJSON);
        })
    })
}


cmdStr = 'INSERT OR REPLACE INTO photoTags VALUES (_IDX, "_NAME", _WIDTH, _HEIGHT, "_LOCTAG", "_TAGS")';
var count = 0;
var succeeded = 0;
var failed = 0;

function insertPhoto(index, name, dimensions, APIresponseJSON) {
    var cmd = cmdStr.replace('_IDX', index);
    cmd = cmd.replace('_NAME', name);
    cmd = cmd.replace('_WIDTH', dimensions.width);
    cmd = cmd.replace('_HEIGHT', dimensions.height);

    if (APIresponseJSON.landmarkAnnotations && APIresponseJSON.landmarkAnnotations[0].description) {
        cmd = cmd.replace('_LOCTAG', APIresponseJSON.landmarkAnnotations[0].description.replace(/"/g, '""'));
    }
    else {
        cmd = cmd.replace('_LOCTAG', '');
    }

    if (APIresponseJSON.labelAnnotations) {
        if (APIresponseJSON.labelAnnotations.length >= 6) {
            var tagStr = APIresponseJSON.labelAnnotations[0].description;
            for (let i = 1; i < 6; i++)
                tagStr += ',' + APIresponseJSON.labelAnnotations[i].description;

            cmd = cmd.replace('_TAGS', tagStr);
        }
        else {
            var tagStr = APIresponseJSON.labelAnnotations[0].description;
            for (let i = 1; i < APIresponseJSON.labelAnnotations.length; i++)
                tagStr += ',' + APIresponseJSON.labelAnnotations[i].description;

            cmd = cmd.replace('_TAGS', tagStr);
        }
    }
    else
        cmd = cmd.replace('_TAGS', '');

    db.run(cmd, dbCallBack);
    function dbCallBack(err) {
        if (err) {
            failed++;
            console.log(cmd);
            console.log(err);
        }
        else
            succeeded++;
            console.log('Successfully inserted photo '+index);
    }

    counter();
    next();
}

function counter() {
    count++;
    if (count == photoList.length) {
        console.log('Insertion completed');
        console.log('succeeded: '+succeeded);
        console.log('failed: '+failed);
        db.close();
    }
}

function next() {
    if (queue.length > 0) {
        queue.pop()();
    }
}

for (let i = 0; i < photoList.length; i++) {
    queue.push(function() {annotateImage(i, photoList[i]);});
}

for (let i = 0; i < 20; i++) {
    next();
}

