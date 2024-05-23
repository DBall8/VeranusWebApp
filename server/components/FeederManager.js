var db = require('./db-sqlite');
var server = require('./ServerUtilities');
var http = require('http');
var socketIo = require('socket.io');

// Configuration settings
const SETTINGS = require(__dirname + "/../settings.json");

const OPEN_MSG = "<OPEN";
const CLOSE_MSG = "<CLOSE";

const ID_CMD = "id";
const ID_CMD_R = "id_r"
const STATUS_CMD = "status";
const STATUS_CMD_R = "status_r";
const CMD_CMD = "cmd";
const CMD_CMD_R = "cmd_r";
const CAL_CMD = "cal";
const CAL_CMD_R = "cal_r";
const LOG_CMD = "log";

/**
 * activeFeeders
 * {
 *      socketId:
 *      {
 *          feederId: num,
 *          callback:
 *          {
 *              cmd: str,
 *              func: function
 *          },
 *          timeoutTimer: timer
 *      }
 * }
 */
var activeFeeders = {};

function initFeederControl(server)
{
    var feederSocket = socketIo(server, 
        {
            path: "/feeder_control",
            pingInterval: SETTINGS.HOPPER_HEARTBEAT_MS,
            pingTimeout: SETTINGS.HOPPER_TIMEOUT_MS});
    feederSocket.on('connect', (feederConn) =>
    {
        feederConn.on('disconnect', () =>
        {
            if (activeFeeders[feederConn.id] != undefined)
            {
                console.log("Feeder " + activeFeeders[feederConn.id].feederId + " disconnected");
                delete activeFeeders[feederConn.id];
            }
        });

        feederConn.on(ID_CMD_R, (msg) =>
        {
            console.log("Hopper " + msg + " connected.");
            removeFeederSocket(msg);
            activeFeeders[feederConn.id] = 
            {
                feederId: msg,
                socket: feederConn,
                callback: null
            };
        });

        feederConn.on(STATUS_CMD_R, (msg) =>
        {
            console.log("Socket rec status_r of " + msg);

            if (!activeFeeders[feederConn.id]) return;
            if (!activeFeeders[feederConn.id].callback) return;
            if (activeFeeders[feederConn.id].callback.cmd != STATUS_CMD_R) return;

            activeFeeders[feederConn.id].callback.func(msg);
        });

        feederConn.on(CAL_CMD_R, (msg) =>
        {
            console.log("Socket rec " + CAL_CMD_R + " of " + msg);

            if (!activeFeeders[feederConn.id]) return;
            if (!activeFeeders[feederConn.id].callback) return;
            if (activeFeeders[feederConn.id].callback.cmd != CAL_CMD_R) return;

            activeFeeders[feederConn.id].callback.func(msg);
        });

        feederConn.on(CMD_CMD_R, (msg) =>
        {
            console.log("Socket rec cmd_r of " + msg);

            if (!activeFeeders[feederConn.id]) return;
            if (!activeFeeders[feederConn.id].callback) return;
            if (activeFeeders[feederConn.id].callback.cmd != "cmd_r") return;

            activeFeeders[feederConn.id].callback.func(msg);
        });

        feederConn.on(LOG_CMD, (msg) =>
        {
            var fId = !activeFeeders[feederConn.id] ? "?" : activeFeeders[feederConn.id].feederId;
            console.log("HOPPER " + fId + ": " + msg);
        })

        // Request the feeder for its ID
        feederConn.emit(ID_CMD);
    })
}

function getFeederSocket(feederId)
{
    for (const [key, value] of Object.entries(activeFeeders))
    {
        if (value.feederId == feederId)
        {
            return value;
        }
    }

    return null;
}

function removeFeederSocket(feederId)
{
    var keysToDelete = []
    for (const [key, value] of Object.entries(activeFeeders))
    {
        if (value.feederId == feederId)
        {
            keysToDelete.push(key);
        }
    }

    for (var i=0; i<keysToDelete.length; i++)
    {
        delete activeFeeders[keysToDelete[i]];
    }
}

function addFeeder(req, res)
{
    /**
     * Input:
     * {
     *      feederId: string,
     *      feederName: string
     * }
     * 
     * Output:
     * {
     *      success: boolean
     * }
     */

    var body = JSON.parse(req.body);

    if (!body || !req.userId || !body.feederId || !body.feederName)
    {
        console.log("ERROR: Invalid new feeder.");
        server.sendInputError(res);
        return;
    }

    db.addFeeder(body.feederId, body.feederName, req.userId)
        .then(() =>
        {
            console.log("Added new feeder for " + req.username + " with ID " + body.feederId);
            server.sendObject(res, {success: true});
        })
        .catch((err) =>
        {
            console.log("Failed to add feeder for " + req.username + " with ID " + body.feederId);
            console.log(err);
            server.sendObject(res, {success: false});
        })
}

function getFeeders(req, res)
{
    /**
     * Input:
     * None, just relies on user session cookie
     * 
     * Output:
     * {
     *      success: boolean,
     *      feeders[]: 
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

    db.getFeeders(req.userId)
        .then((feederList) =>
        {
            server.sendObject(res,
                {
                    success: true,
                    feeders: feederList
                });
        })
        .catch((err) =>
        {
            console.log(err);
            server.sendInternalError(res);
        });
}

/**
 * Send the feeder's status
 * 
 * Input: GET with "id"
 * 
 * Output:
 * {
 *      success: true/false
 *      id: int
 *      status: int
 * }
 * 
 * Where status val:
 * 0 = Uncalibrated
 * 1 = Open
 * 2 = Closed
 * 3 = Ajar
 * 4 = Hopper error
 * 5 = Server error
 */
function getFeederStatus(req, res)
{
    if (!req.query || !req.query.id)
    {
        server.sendInputError(res);
        return;
    }
    var feederObj = getFeederSocket(req.query.id);

    if (!feederObj)
    {
        // No connected feeder with this ID
        server.sendInternalError(res);
        return;
    }

    feederObj.callback = {};
    feederObj.callback.cmd = STATUS_CMD_R;
    feederObj.callback.func = (msg) =>
    {
        // Stop timeout timer
        if (feederObj.timeoutTimer)
        {
            clearTimeout(feederObj.timeoutTimer);
        }

        if (msg == null)
        {
            server.sendInternalError(res);
            return;
        }

        msg = msg.trim();
        var status = 5;
        var success = true;
        if (msg === "0")
        {
            status = 0;
        }
        else if (msg === "1")
        {
            status = 1;
        }
        else if (msg === "2")
        {
            status = 2;
        }
        else if (msg === "3")
        {
            status = 3;
        }
        else
        {
            success = false;
            status = 4;
        }

        var responseBody =
        {
            success: success,
            status: status,
            id: req.query.id
        };

        server.sendObject(res, responseBody);
    };

    feederObj.timeoutTimer = setTimeout(() =>
        {
            feederObj.callback = null;
            server.sendInternalError(res);
        },
        SETTINGS.FEEDER_CMD_TIMEOUT_MS);
    
    // Send a status command
    console.log("Getting status of feeder " + req.query.id);
    feederObj.socket.emit(STATUS_CMD);
}

/**
 * Input:
 * {
 *      id: string,
 *      status: int
 * }
 * 
 * Where status:
 *  1 = OPEN
 *  2 = CLOSE
 * 
 * Output:
 * {
 *      success: boolean
 * }
 */
function controlFeeder(req, res)
{
    if (!req.body)
    {
        server.sendInputError(res);
        return;
    }

    var body = JSON.parse(req.body);
    if (!body || !body.id)
    {
        server.sendInputError(res);
        return;
    }

    var cmd;
    if (body.status == 1)
    {
        cmd = OPEN_MSG;
    }
    else if (body.status == 2)
    {
        cmd = CLOSE_MSG;
    }
    else
    {
        server.sendInputError(res);
        return;
    }

    var feederObj = getFeederSocket(body.id);

    if (!feederObj)
    {
        // No connected feeder with this ID
        server.sendInternalError(res);
        return;
    }

    feederObj.callback = {};
    feederObj.callback.cmd = CMD_CMD_R;
    feederObj.callback.func = (msg) =>
    {
        if (feederObj.timeoutTimer)
        {
            clearTimeout(feederObj.timeoutTimer);
        }

        console.log("FEEDER RESP: " + msg);

        if (msg == null)
        {
            server.sendInternalError(res);
            return;
        }

        var status = 5;
        var success = true;
        if (isNaN(msg) || (msg < 0) || msg > 4)
        {
            success = false;
            status = 4;
        }
        else
        {
            status = msg;
        }

        var responseBody =
        {
            success: success,
            status: status,
            id: body.id
        };

        server.sendObject(res, responseBody);
    };

    feederObj.timeoutTimer = setTimeout(() =>
        {
            feederObj.callback = null;
            server.sendInternalError(res);
        },
        SETTINGS.FEEDER_CMD_TIMEOUT_MS);
    
    // Send a status command
    console.log("Asking feeder " + body.id + " to " + cmd);
    feederObj.socket.emit(CMD_CMD, cmd);
}

function deleteFeeder(req, res)
{
    /**
     * Input:
     * id: int
     * 
     * Output:
     * {
     *      success: bool
     * }
     */
    var body = JSON.parse(req.body);

    if (!body || !req.userId || !body.id)
    {
        server.sendInputError(res);
        return;
    }

    db.getFeederOwner(body.id)
        .then((result) =>
        {
            if (req.userId !== result.ownerId)
            {
                server.sendInputError(res);
                return;
            }

            // TODO control feeder
            db.deleteFeeder(body.id).then(() =>
            {
                server.sendObject(res,
                {
                    success: true,
                });
            }).catch((err) =>
            {
                console.log("Failed to delete feeder " + body.id + ": " + err);
                server.sendInternalError(res);
            });
        })
        .catch((err) =>
        {
            console.log("Could not find owner of feeder " + body.id + ": " + err);
            server.sendInternalError(res);
        })
}

/**
 * Input:
 * {
 *      id: string,
 *      step: string 
 * }
 * 
 * Where step:
 *   start
 *   open
 *   close
 *
 * Output:
 * {
 *      success: boolean
 * }
 */
function calibrateFeeder(req, res)
{
    let calStep = null;

    if (!req.body)
    {
        server.sendInputError(res);
        return;
    }

    let body = JSON.parse(req.body);
    if (!body || !body.id || !body.step)
    {
        server.sendInputError(res);
        return;
    }

    if (body.step.toLowerCase() === 'start')
    {
        calStep = 'S';
    }
    else if (body.step.toLowerCase() === 'open')
    {
        calStep = 'O';
    }
    else if (body.step.toLowerCase() === 'close')
    {
        calStep = 'C';
    }
    else
    {
        server.sendInputError(res);
        return;
    }

    let feederObj = getFeederSocket(body.id);
    if (!feederObj)
    {
        // No connected feeder with this ID
        server.sendInternalError(res);
        return;
    }

    feederObj.callback = {};
    feederObj.callback.cmd = CAL_CMD_R;
    feederObj.callback.func = (msg) =>
    {
        if (feederObj.timeoutTimer)
        {
            clearTimeout(feederObj.timeoutTimer);
        }

        if (msg == null)
        {
            server.sendInternalError(res);
            return;
        }

        let success = (msg == "pass");
        let responseBody =
        {
            success: success,
            id: body.id
        };

        server.sendObject(res, responseBody);
    };

    feederObj.timeoutTimer = setTimeout(() =>
        {
            feederObj.callback = null;
            server.sendInternalError(res);
        },
        SETTINGS.FEEDER_CAL_TIMEOUT_MS);
    
    // Send a status command
    console.log("Feeder " + body.id + " cal step " + body.step);
    feederObj.socket.emit(CAL_CMD, calStep);
}

exports.initFeederControl = initFeederControl;
exports.addFeeder = addFeeder;
exports.getFeeders = getFeeders;
exports.getFeederStatus = getFeederStatus;
exports.controlFeeder = controlFeeder;
exports.deleteFeeder = deleteFeeder;
exports.calibrateFeeder = calibrateFeeder;
