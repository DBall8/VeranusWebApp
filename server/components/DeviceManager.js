var db = require('./db-sqlite');
var server = require('./ServerUtilities');
var path = require('path');
var fs = require('fs');

const IMAGE_DIR = path.resolve(__dirname + "../../../images/");

function addDevice(req, res)
{
    /**
     * Input:
     * {
     *      deviceId: string,
     *      deviceName: string
     * }
     * 
     * Output:
     * {
     *      success: boolean
     * }
     */
    var body = JSON.parse(req.body);

    if (!body || !req.userId || !body.deviceName || !body.deviceId)
    {
        // Failed to include required information
        console.log("ERROR: Invalid new device request");
        server.sendError(res);
        return;
    }

    db.addDevice(body.deviceId, body.deviceName, req.userId)
        .then(() => 
        {
            console.log("Added new device for " + req.username + " with ID " + body.deviceId);
            server.sendObject(res, {success: true});
        })
        .catch((err) =>
        {
            console.log("Failed to add device for " + req.username + " with ID " + body.deviceId);
            console.log(err);
            server.sendObject(res, {success: false});
        })
}

function getDevices(req, res)
{
    /**
     * Input:
     * None, just relies on user session cookie
     * 
     * Output:
     * {
     *      success: boolean,
     *      devices[]: 
     *          {
     *              id: string,
     *              name: string
     *          }
     * }
     */
    if (!req.userId)
    {
        server.sendInputError(res);
        return;
    }

    db.getDevices(req.userId)
        .then((deviceList) =>
        {
            server.sendObject(res,
                {
                    success: true,
                    devices: deviceList
                });
        })
        .catch((err) =>
        {
            console.log(err);
            server.sendInternalError(res);
        });
}

function deleteDevice(req, res)
{
    /**
     * Input:
     * deviceId: string,
     * userId: string
     * 
     * Output:
     * {
     *      success: boolean
     *      reason: string
     * }
     */
    var body = JSON.parse(req.body);

    if (!body || !body.deviceId || !req.userId)
    {
        res.sendInputError(res);
        return;
    }

    db.getDeviceOwner(body.deviceId)
        .then((ownerId) =>
        {
            if (ownerId !== req.userId)
            {
                // Attempted to delete a device not owned by this user
                var response =
                {
                    success: false,
                    reason: "User does not own this device."
                };
                server.sendObject(res, response);
                return;
            }

            db.deleteDevice(body.deviceId)
                .then(() =>
                {
                    server.sendObject(res, {success: true})
                })
                .catch((err) =>
                {
                    console.log("Failed to delete device with ID: " + deviceId);
                    console.log(err);
                    server.sendInternalError(res);
                })
        })
        .catch((err) =>
        {
            console.log("Failed to validate ownership of device.");
            console.log(err);
            server.sendInternalError(res);
        })
}

function addReading(deviceId, reading)
{
    db.addReading(deviceId, reading.temperature, reading.humidity, reading.light, reading.timestamp)
        .then(() =>
        {
            console.log("Reading successfully stored");
        })
        .catch((err) =>
        {
            console.log("Failed to store reading:");
            console.log(err);
        });
}

function getReadings(req, res)
{
    /**
     * Input:
     * Query string in url with parameter name "id" and "count"
     * 
     * Output:
     * {
     *      success: boolean,
     *      deviceId: string,
     *      readings[]:
     *      {
     *          temperature: number,
     *          humidity: number,
     *          light: number,
     *          timestamp: number
     *      }
     * }
     */
    if (!req.userId || !req.query || !req.query.id)
    {
        // Invalid request
        server.sendInputError(res);
        return;
    }

    var deviceId = req.query.id;
    var numReadings = req.query.count;
    db.getReadings(deviceId, numReadings)
        .then((readings) =>
        {
            var result = 
            {
                success: true,
                deviceId: deviceId,
                readings: readings
            };

            server.sendObject(res, result);
        })
        .catch((err) =>
        {
            console.log("Unable to retreive device with ID " + req.body.deviceId);
            console.log(err);
            server.sendInternalError(res);
        })
}

function getRanges(req, res)
{
    /**
     * Input:
     * Query string in url with parameter name "id"
     * 
     * Output:
     * {
     *      success: boolean,
     *      deviceId: string,
     *      temperatureRange:
     *          {
     *              dangerLow: number,
     *              dangerHigh: number,
     *              warningLow: number,
     *              warningHigh: number,
     *          }
     *      humidityRange: (same as temp range)
     *      lightRange: (same as temp range)
     *      
     * }
     */
    if (!req.userId || !req.query || !req.query.id)
    {
        // Invalid request
        server.sendInputError(res);
        return;
    }

    var deviceId = req.query.id;
    db.getRanges(deviceId)
        .then((result) =>
        {
            var result = 
            {
                success: true,
                deviceId: deviceId,
                temperatureRange: result.temperatureRange,
                humidityRange: result.humidityRange,
                lightRange: result.lightRange
            };

            server.sendObject(res, result);
        })
        .catch((err) =>
        {
            console.log("Unable to retreive range for ID " + req.body.deviceId);
            console.log(err);
            server.sendInternalError(res);
        })
}

function updateRanges(req, res)
{
    /**
     * Input:
     * {
     *      deviceId: string,
     *      temperatureRange:
     *          {
     *              dangerLow: number,
     *              dangerHigh: number,
     *              warningLow: number,
     *              warningHigh: number,
     *          }
     *      humidityRange: (same as temp range)
     *      lightRange: (same as temp range)
     * }
     * 
     * Output:
     * {
     *      success: boolean,
     *      
     * }
     */
    if (!req.userId || !req.body)
    {
        // Invalid request
        server.sendInputError(res);
        return;
    }
    
    var body = JSON.parse(req.body);
    if (!body.deviceId || !body.temperatureRange || !body.humidityRange || !body.lightRange)
    {
        // Invalid request parameters
        server.sendInputError(res);
        return;
    }

    db.updateRanges(body.deviceId, body.temperatureRange, body.humidityRange, body.lightRange)
        .then(() =>
        {
            var result = 
            {
                success: true,
            };

            server.sendObject(res, result);
        })
        .catch((err) =>
        {
            console.log("Unable to retreive range for ID " + req.body.deviceId);
            console.log(err);
            server.sendInternalError(res);
        })
}

const imageTypeMap =
[
    {extension: 'png', type: 'image/png'},
    {extension: 'gif', type: 'image/gif'},
    {extension: 'jpg', type: 'image/jpeg'}
];

function getImageExtension(imageType)
{
    if (!imageType) return null;
    
    for (var i=0; i<imageTypeMap.length; i++)
    {
        if (imageType === imageTypeMap[i].type)
        {
            return imageTypeMap[i].extension;
        }
    }
    
    return null;
}

function getImageType(imagePath)
{
    if (!imagePath) return null;

    var split = imagePath.split('.');
    if (!split[1])
    {
        return null;
    }

    for (var i=0; i<imageTypeMap.length; i++)
    {
        if (split[1] === imageTypeMap[i].extension)
        {
            return imageTypeMap[i].type;
        }
    }
    
    return null;
}

function getImagePathNoExt(userId, deviceId)
{
    return __dirname + '/../../images/' + userId + '/' + userId + '-' + deviceId;
}

function findImage(userId, deviceId)
{
    var imagePathNoExt = getImagePathNoExt(userId, deviceId);

    for (var i=0; i<imageTypeMap.length; i++)
    {
        var filePath = imagePathNoExt + '.' + imageTypeMap[i].extension;
        if (fs.existsSync(filePath))
        {
            return filePath;
        }
    }
    
    return null;
}

function getImage(req, res)
{
    if (!req.userId)
    {
        server.sendInputError(res);
        return;
    }

    var split = req.url.split('/');
    if (split.length < 3)
    {
        // We expected a request url of format /images/<deviceId>
        server.sendInputError(res);
        return;
    }

    var deviceId = split[2];
    var imagePath = findImage(req.userId, deviceId);
    var imageType = getImageType(imagePath);

    if (imagePath)
    {
        server.sendFile(res, imagePath, imageType);
    }
    else
    {
        res.writeHead(404);
        res.end();
    }
    
}

function updateImage(req, res)
{
    /**
     * Input:
     * {
     *      deviceId: string,
     *      file: [],
     *      type: string
     * }
     * 
     * Output:
     * {
     *      success: boolean,
     *      
     * }
     */
    if (!req.userId || !req.body)
    {
        // Invalid request
        server.sendInputError(res);
        return;
    }
    
    var body = JSON.parse(req.body);
    if (!body.deviceId || !body.file || !body.type)
    {
        // Invalid request parameters
        server.sendInputError(res);
        return;
    }

    var imageDir = IMAGE_DIR + '/' + req.userId;
    var imagePathNoExt = getImagePathNoExt(req.userId, body.deviceId);
    var imageExtension = getImageExtension(body.type);

    if (!imagePathNoExt || !imageExtension)
    {
        console.log("Failed to build file path: " + imagePathNoExt + '.' + imageExtension);
        console.log('Type: ' + body.type);
        server.sendInternalError(res);
        return;
    }

    var imagePath = imagePathNoExt + '.' + imageExtension;

    // Create image directory for this user if one does not already exist
    if (!fs.existsSync(imageDir))
    {
        fs.mkdirSync(imageDir);
    }
    else
    {
        // Otherwise, make sure to delete any old image
        var existingImage = findImage(req.userId, body.deviceId)
        if (existingImage)
        {
            fs.unlinkSync(existingImage);
        }
    }

    // Write the image to this file, and return the success result
    var values = new Uint8Array(body.file);
    fs.writeFile(imagePath, values, (err) =>
    {
        if (err)
        {
            console.log(err);
            server.sendInternalError(res);
        }
        else
        {
            server.sendObject(res, {success: true});
        }
       
    });
}

function removeImage(req, res)
{
    /**
     * Input:
     * {
     *      deviceId: string,
     * }
     * 
     * Output:
     * {
     *      success: boolean,
     * }
     */
    if (!req.userId || !req.body)
    {
        // Invalid request
        server.sendInputError(res);
        return;
    }
    
    var body = JSON.parse(req.body);
    if (!body.deviceId)
    {
        // Invalid request parameters
        server.sendInputError(res);
        return;
    }

    var imagePath = findImage(req.userId, body.deviceId);

    // Create image directory for this user if one does not already exist
    if (imagePath)
    {
        fs.unlinkSync(imagePath);
    }
    
    server.sendObject(res, {success: true});
}

exports.addDevice = addDevice;
exports.getDevices = getDevices;
exports.deleteDevice = deleteDevice;
exports.addReading = addReading;
exports.getReadings = getReadings;
exports.getRanges = getRanges;
exports.updateRanges = updateRanges;
exports.updateImage = updateImage;
exports.getImage = getImage;
exports.removeImage = removeImage;