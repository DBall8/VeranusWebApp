var fs = require('fs');

function sendFile(res, filename, type)
{
    type = type || 'text/html'
    fs.readFile(filename, function (error, content) {
        if (error) {
            console.log(error);
        }
        res.writeHead(200, { 'Content-type': type });
        res.end(content, 'utf-8');

    })
}

function sendObject(res, object)
{
    res.writeHead(200, {'Conent-type': 'application/json'});
    res.end(JSON.stringify(object));
}

function sendInputError(res)
{
    res.writeHead(400)
    res.end();
}

function sendInternalError(res)
{
    res.writeHead(500)
    res.end();
}

exports.sendFile = sendFile;
exports.sendObject = sendObject;
exports.sendInputError = sendInputError;
exports.sendInternalError = sendInternalError;