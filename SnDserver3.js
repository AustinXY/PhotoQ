var http = require('http');
var static = require('node-static');
var sqlite3 = require("sqlite3").verbose();
var dbFileName = "PhotoQ.db";
var db = new sqlite3.Database(dbFileName);
var fs = require('fs');
var auto = require("./makeTagTable");

// // code run on startup
// // loadImageList();

// // just for testing, you can cut this out
// // console.log(imgList[354]);
var tagTable = {}; // global
var COND = '(location = "_STR" OR tags LIKE "%_STR%")';
// create static server
var staticServer = new static.Server('./public');
var tagList = JSON.parse(fs.readFileSync('tagList.json'));

function requsetListener(request, response) {
    var url = request.url;
    console.log("url: " + url);
    var demand = url.split('/')[1];
    // response with dynamic server
    if (demand.split('?')[0] == 'query') {
        if (demand.split('=')[0] == 'query?keyList') {
            var cmdStr = 'SELECT fileName AS src, idNum, width, height, location, tags FROM photoTags WHERE ';
            var tagArr = demand.split('=')[1].split('+');
            var cond = '';

            for (let i = 0; i < tagArr.length; i++) {
                if (/^[a-z A-Z]+$/.test(decodeURIComponent(tagArr[i]))) {
                    cond = COND.replace(/_STR/g, decodeURIComponent(tagArr[i]))
                    cmdStr += cond + ' AND ';
                }
            }

            console.log(cmdStr);

            if (cmdStr.includes('AND'))
                cmdStr = cmdStr.substring(0, cmdStr.length-5);
            else {
                response.writeHead(400, {"Content-Type": "text/ plain"});
                // write into body
                response.write("Bad Request\n");
                response.end();
                return;
            }

            db.all(cmdStr, dataCallBack);
            function dataCallBack (err, data) {
                if (err)
                    console.log(err);
                else {
                    var returnObj = {photos:data};
                    if (data.length == 0)
                        returnObj.message = 'There were no photos satisfying this query.';
                    else
                        returnObj.message = 'These are all of the photos satisfying this query.';

                    response.writeHead(200, {"Content-Type": "text/ plain"});
                    response.write(JSON.stringify(returnObj));
                    response.end();
                    return;
                }
            }
        }
        else if (demand.split('=')[0] == 'query?autocomplete') {
            var prefix = demand.split('=')[1];
            if (tagList[prefix]) {
                response.writeHead(200, {"Content-Type": "text/ plain"});
                response.write(JSON.stringify(tagList[prefix]));
                response.end();
                return;
            }
            else {
                response.writeHead(400, {"Content-Type": "text/ plain"});
                response.write("Bad Request\n");
                response.end();
                return;
            }
        }
        // bad request
        else {
            response.writeHead(400, {"Content-Type": "text/ plain"});
            // write into body
            response.write("Bad Request\n");
            response.end();
            return;
        }
    }
    else if (demand.split('=')[0] == 'addtag') {
        var id = demand.split('=')[1].split('+')[0];
        var newTag = demand.split('=')[1].split('+')[1];
        var cmdStr = 'SELECT tags FROM photoTags WHERE (idNum = ' + id + ' )';
        db.all(cmdStr, dataCallBack);
        function dataCallBack (err, data) {
            if (err)
                console.log(err);
            else {
                var origTags = data[0].tags;
                origTags += ',' + newTag;
                cmdStr = 'UPDATE photoTags SET tags = "' + origTags + '" WHERE (idNum = ' + id + ' )';
                db.run(cmdStr, dbCallBack);
                function dbCallBack(err) {
                    if (err) {
                        console.log(cmdStr);
                        console.log(err);
                    }
                    else {
                        auto.makeTagTable(tagTableCallBack);
                        function tagTableCallBack(data) {
                            tagTable = data;
                        }

                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write(JSON.stringify('add tag successful'));
                        response.end();
                        cmdStr = 'SELECT * FROM photoTags WHERE (idNum = ' + id + ' )';
                        db.all(cmdStr, dataCallBack);
                        function dataCallBack (err, data) {
                            if (err)
                                console.log(err);
                            else
                                console.log('updated:',data);
                        }
                    }
                }
            }
        }
    }
    else if (demand.split('=')[0] == 'rmtag') {
        var id = demand.split('=')[1].split('+')[0];
        var tagText = decodeURIComponent(demand.split('=')[1].split('+')[1]);
        var cmdStr = 'SELECT tags FROM photoTags WHERE (idNum = ' + id + ' )';
        db.all(cmdStr, dataCallBack);
        function dataCallBack (err, data) {
            if (err) {
                console.log(cmdStr);
                console.log(err);
            }
            else {
                var origTags = data[0].tags.split(',');
                for (var i = 0; i < origTags.length; i++) {
                    if (origTags[i] == tagText) {
                        break;
                    }
                }

                origTags.splice(i, 1);
                cmdStr = 'UPDATE photoTags SET tags = "' + origTags.join(',') + '" WHERE (idNum = ' + id + ' )';
                console.log(cmdStr);
                db.run(cmdStr, dbCallBack);
                function dbCallBack(err) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        auto.makeTagTable(tagTableCallBack);
                        function tagTableCallBack(data) {
                            tagTable = data;
                        }

                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write(JSON.stringify('remove tag successful'));
                        response.end();
                        cmdStr = 'SELECT * FROM photoTags WHERE (idNum = ' + id + ' )';
                        db.all(cmdStr, dataCallBack);
                        function dataCallBack (err, data) {
                            if (err)
                                console.log(err);
                            else
                                console.log('updated:',data);
                        }
                    }
                }
            }
        }
    }
    else {
        if (demand == '') {
            demand = 'testWHS3.html';
            request.url += 'testWHS3.html';
        }

        var file = './public/' + demand;
        // check if file exist in ./public
        fs.access(file, fs.constants.F_OK, function (err) {
            debugger;
            console.log(`${file} ${err ? 'does not exist' : 'exists'}`);
            // no error; file found
            if (!err){
                request.addListener('end', function () {
                    staticServer.serve(request, response);
                }).resume();
            }
            // file not found
            else
                staticServer.serveFile('not-found.html', 404, {}, request, response);
        });
    }
}

HTTPServer = http.createServer(requsetListener);
HTTPServer.listen("56260");