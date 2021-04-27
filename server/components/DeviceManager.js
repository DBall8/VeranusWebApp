var db = require('./db-sqlite');
var server = require('./ServerUtilities')

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

exports.addDevice = addDevice;
exports.getDevices = getDevices;
exports.deleteDevice = deleteDevice;
exports.addReading = addReading;
exports.getReadings = getReadings;
exports.getRanges = getRanges;
exports.updateRanges = updateRanges;