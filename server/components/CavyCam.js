var server = require('./ServerUtilities');
var fs = require('fs');
var http = require('http');
var path = require('path');

// Configuration settings
const SETTINGS = require(__dirname + "../../settings.json");

const CAPTURE_DIR = path.resolve(__dirname + "../../../captures/");

function handleCapture(req, res)
{
    if (!SETTINGS.SUPER_USER || !req.username || (req.username != SETTINGS.SUPER_USER))
    {
        server.sendInputError(res);
        return;
    }
        
    http.get(SETTINGS.CAVYCAM_URL + 'capture', camRes =>
    {
        console.log(`statusCode: ${camRes.statusCode}`)

        // Create capture folder if it does not exist
        if (!fs.existsSync(CAPTURE_DIR))
        {
            fs.mkdirSync(CAPTURE_DIR);
        }
        
        var image = '';
        camRes.setEncoding('binary');
        camRes.on('data', d =>
        {
            image += d;
        })

        camRes.on('end', () =>
        {
            var capturePath = CAPTURE_DIR + '/image1.jpg'
            fs.writeFile(capturePath, image, 'binary', (err) =>
            {
                if (err)
                {
                    console.log("Failed to save image file.")
                    console.log(err);
                    server.sendInternalError(res);
                }
                else
                {
                    console.log("Image saved to " + capturePath);
                    var body =
                    {
                        success: true,
                        image: capturePath
                    };
                    server.sendObject(res, body);
                }
            });
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        console.log(err);
    });
}

exports.handleCapture = handleCapture;