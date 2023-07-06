var firebase = require('./firebase-config');
var deviceManager = require('./DeviceManager');
var userManager = require('./UserManager');
var db = require('./db-sqlite');

const SETTINGS = require(__dirname + "/../settings.json");

const NOTIF_TITLE = "Veranus Alert";
const DANGER_TAG = "DANGER";
const WARNING_TAG = "WARNING";
const DANGER_DESC = " dangerously";
const WARNING_DESC = "";
const HIGH_DESC = "high";
const LOW_DESC = "low";

const DANGER_HIGH = 2;
const WARNING_HIGH = 1;
const READING_OK = 0;
const WARNING_LOW = -1;
const DANGER_LOW = -2;
const RANGE_ERR = 99;

/*
 * deviceId:
 * {
 *      name: string
 *      tempLevel: int
 *      humidityLevel: int
 *      lightLevel: int
 *      offlineTimer: timer
 * }
 */
var activeDevices = {};

function sendNotification(deviceId, title, msgBody)
{
    deviceManager.getDeviceOwner(deviceId)
        .then((userId) =>
        {
            userManager.getUserToken(userId)
            .then((token) =>
            {
                if (!token)
                {
                    console.log("User " + userId + " has no token.");
                    return;
                }

                const message = 
                    {
                        notification:
                        {
                            title: title,
                            body: msgBody
                        }
                    };
                const options = 
                {
                    priority: "high",
                    timeToLive: 60 * 60 * 24
                };
                firebase.admin.messaging().sendToDevice(token, message, options)
                    .then((response) =>
                    {
                        if (response.failureCount > 0)
                        {
                            console.log("Notif for device " + deviceId + " failed.");
                        }
                    })
                    .catch((err) =>
                    {
                        console.log("Sending push notif failed:");
                        console.log(err);
                    })
        })
        .catch((err) =>
        {
            console.log("Failed to get FB token for user [" + userId + "]");
            console.log(err);
        })
    })
    .catch((err) =>
    {
        console.log("Could not find ownder of device " + deviceId);
    })
}

function getStatus(range, value)
{
    if (!range)
    {
        return RANGE_ERR;
    }

    if (value > range.dangerHigh)
    {
        return DANGER_HIGH;
    }
    else if (value < range.dangerLow)
    {
        return DANGER_LOW;
    }
    else if (value > range.warningHigh)
    {
        return WARNING_HIGH;
    }
    else if (value < range.warningLow)
    {
        return WARNING_LOW;
    }

    return READING_OK;
}

function shouldChangeTriggerAlert(oldReading, newReading)
{
    if (newReading == RANGE_ERR) return false;  // Currently in error
    if (oldReading == newReading) return false; // No change

    // Was in error, but now in warning/danger
    if ((oldReading == RANGE_ERR) && (newReading != READING_OK)) return true;

    // Value has increased to new alert range
    if ((newReading > oldReading) && (newReading > READING_OK)) return true;

    // Value has decreased to new alert range
    if ((newReading < oldReading) && (newReading < READING_OK)) return true;

    // Value has changed, but has moved to lower danger level
    return false;
}

function sendAlert(deviceId, type, level)
{
    if (!activeDevices[deviceId]) return;

    var tagStr = "ERROR";
    var descStr = "ERROR";
    var devName = activeDevices[deviceId].name;

    switch (level)
    {
        case DANGER_HIGH:
            tagStr = DANGER_TAG;
            descStr = DANGER_DESC + " " + HIGH_DESC;
            break;
        case WARNING_HIGH:
            tagStr = WARNING_TAG;
            descStr = WARNING_DESC + " " + HIGH_DESC;
            break;
        case WARNING_LOW:
            tagStr = WARNING_TAG;
            descStr = WARNING_DESC + " " + LOW_DESC;
            break;
        case DANGER_LOW:
            tagStr = DANGER_TAG;
            descStr = DANGER_DESC + " " + LOW_DESC;
            break;
        default:
            break;
    }

    var notifBody = tagStr + ": Device '" + devName + ' detects' + descStr + " " + type + ".";

    console.log("Sending alert:");
    console.log(notifBody);

    sendNotification(
        deviceId,
        NOTIF_TITLE,
        notifBody);
}

function updateDevice(deviceId, newReadings)
{
    if (!activeDevices[deviceId] || !newReadings) return;
    var deviceData = activeDevices[deviceId];

    db.getRanges(deviceId)
    .then((ranges) =>
    {
        var newTempLevel = getStatus(ranges.temperatureRange, newReadings.temperature);
        if (shouldChangeTriggerAlert(deviceData.tempLevel, newTempLevel))
        {
            sendAlert(deviceId, "temperature", newTempLevel);
        }

        var newHumidityLevel = getStatus(ranges.humidityRange, newReadings.humidity);
        if (shouldChangeTriggerAlert(deviceData.humidityLevel, newHumidityLevel))
        {
            sendAlert(deviceId, "humidity", newHumidityLevel);
            
        }

        var newLightLevel = getStatus(ranges.lightRange, newReadings.light);
        if (shouldChangeTriggerAlert(deviceData.lightLevel, newLightLevel))
        {
            sendAlert(deviceId, "light", newLightLevel);
        }

        deviceData.tempLevel = newTempLevel;
        deviceData.humidityLevel = newHumidityLevel;
        deviceData.lightLevel = newLightLevel;
    })
    .catch((err) =>
    {
        console.log("Failed to get ranges for device " + deviceId);
        console.log(err);

        deviceData.tempLevel = newTempLevel;
        deviceData.humidityLevel = newHumidityLevel;
        deviceData.lightLevel = newLightLevel;
    })
}

function sendOfflineMessage(deviceId)
{
    console.log("Device " + deviceId + " offline.");
    if (!activeDevices[deviceId]) return;
    sendNotification(deviceId, NOTIF_TITLE, "Device '" + activeDevices[deviceId].name + "' is not responding.");
}

function handleReadings(deviceId, newReadings)
{
    if (!activeDevices[deviceId])
    {
        // Add new active device object, but first get its name
        db.getDevice(deviceId)
        .then((device) =>
        {
            activeDevices[deviceId] =
            {
                name: device.name,
                tempLevel: 0,
                humidityLevel: 0,
                lightLevel: 0,
                offlineTimer: setTimeout(() => sendOfflineMessage(deviceId), SETTINGS.DEVICE_TIMEOUT_MS)
            };

            updateDevice(deviceId, newReadings);
        })
        .catch((err) =>
        {
            console.log("Could not get device " + deviceId);
            console.log(err);
        })
    }
    else
    {
        clearTimeout(activeDevices[deviceId].offlineTimer);
        activeDevices[deviceId].offlineTimer = setTimeout(() => sendOfflineMessage(deviceId), SETTINGS.DEVICE_TIMEOUT_MS);

        updateDevice(deviceId, newReadings);
    }
}

function sendTest(userName)
{
    db.getUser(userName)
    .then((user) =>
    {
        if (!user || !user.token)
        {
            console.log("Cannot find info for user " + userName);
            return;
        }

        const message = 
            {
                notification:
                {
                    title: "Test Message",
                    body: "This is a test message for user " + userName
                }
            };
        const options = 
        {
            priority: "high",
            timeToLive: 60 * 60 * 24
        };
        firebase.admin.messaging().sendToDevice(user.token, message, options)
            .then((response) =>
            {
                if (response.failureCount > 0)
                {
                    console.log("Test message failed.");
                }
                else
                {
                    console.log("Test message sent to " + userName);
                }
            })
            .catch((err) =>
            {
                console.log("Sending push notif failed:");
                console.log(err);
            })
    })
    .catch((err) =>
    {
        reject(err);
    })
}

exports.handleReadings = handleReadings;
exports.sendTest = sendTest;