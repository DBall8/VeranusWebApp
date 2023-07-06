const { resolve } = require('path');
var sqlite = require('sqlite3'),
    path = require('path')

// Configuration settings
const SETTINGS = require(__dirname + "/../settings.json");

const dbPath = path.resolve(__dirname + '../../../db/veranus.db');

const DEFAULT_DANGER_LOW = 0;
const DEFAULT_DANGER_HIGH = 100;
const DEFAULT_WARNING_LOW = 0;
const DEFAULT_WARNING_HIGH = 100;

var db;

/**
 * Database structure:
 * 
 * Users Table:
 *      id: Integer (Primary key)
 *      name: Text (Unique)
 *      salt: Text
 *      hash: Text
 *      token: Text
 * 
 * Devices Table:
 *      id: Text (Primary key)
 *      name: Text
 *      ownerId: Integer (Foreign key => users.id)
 *      temperatureRangeId: Integer (Foreign key => ranges.id)
 *      humidityRangeId: Integer (Foreign key => ranges.id)
 *      lightRangeId: Integer (Foreign key => ranges.id)
 * 
 * Readings Table:
 *      deviceId: Text (Foreign key => devices.id)
 *      temperature: Real
 *      humidity: Real
 *      light: Real
 *      timestamp: Integer
 * 
 * Range Table
 *      id: Integer (Primary key)
 *      dangerLow: Real
 *      dangerHigh: Real
 *      warningLow: Real
 *      warningHigh: Real
 * 
 * Feeders Table
 *      id: Integer (Primary key)
 *      name: Text
 *      ownerId: Integer (Foreign key => users.id)
 */
function createTables()
{
    db.run("CREATE TABLE IF NOT EXISTS users (" +
           "id INTEGER PRIMARY KEY AUTOINCREMENT," +
           "name TEXT UNIQUE," +
           "salt TEXT," +
           "hash TEXT," +
           "token TEXT);",
           (err) =>
        {
            if (err)
            {
                console.log("Failed to create USERS table")
                console.log(err);
            }
        })


    db.run("CREATE TABLE IF NOT EXISTS devices (" +
           "id TEXT PRIMARY KEY," +
           "name TEXT," +
           "ownerId INTEGER," +
           "temperatureRangeId INTEGER," +
           "humidityRangeId INTEGER," +
           "lightRangeId INTEGER," +
           "FOREIGN KEY (temperatureRangeId) REFERENCES ranges (id)," +
           "FOREIGN KEY (humidityRangeId) REFERENCES ranges (id)," +
           "FOREIGN KEY (lightRangeId) REFERENCES ranges (id));",
           (err) =>
        {
            if (err)
            {
                console.log("Failed to create DEVICES table")
                console.log(err);
            }
        })

    db.run("CREATE TABLE IF NOT EXISTS readings (" +
           "deviceId TEXT," +
           "temperature REAL," +
           "humidity REAL," +
           "light REAL," +
           "timestamp INTEGER," +
           "FOREIGN KEY (deviceId) REFERENCES devices (id));",
           (err) =>
        {
            if (err)
            {
                console.log("Failed to create READINGS table")
                console.log(err);
            }
        })

    db.run("CREATE TABLE IF NOT EXISTS ranges (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "dangerLow REAL," +
        "dangerHigh REAL," +
        "warningLow REAL," +
        "warningHigh REAL);",
        (err) =>
     {
         if (err)
         {
             console.log("Failed to create RANGES table")
             console.log(err);
         }
     })

     db.run("CREATE TABLE IF NOT EXISTS feeders (" +
        "id INTEGER PRIMARY KEY," +
        "name TEXT," +
        "ownerId INTEGER," +
        "FOREIGN KEY (ownerId) REFERENCES users (id));",
        (err) =>
     {
         if (err)
         {
             console.log("Failed to create FEEDERS table")
             console.log(err);
         }
     })
}

function connect()
{
    return new Promise((resolve, reject) =>
    {
        //const openOptions = sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE
        db = new sqlite.Database(dbPath, sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE, (err) =>
        {
            if (err)
            {
                reject(err);
                return;
            }

            // Make sure all tables exist
            createTables();
            resolve();
        })
    })
}

/**
 * Create, resolve true if user already exists
 */
function addUser(name, salt, hash)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`INSERT INTO users (name, salt, hash) VALUES ('${name}', '${salt}', '${hash}');`,
            (err) =>
            {
                if (err)
                {
                    // Username is taken, return true to show user already exists
                    if (err.code == 'SQLITE_CONSTRAINT')
                    {
                        resolve(true);
                        return;
                    }

                    reject(err);
                    return;
                }

                resolve(false);
            }
        );
    })
}

function addDevice(id, name, ownerId)
{
    return new Promise((resolve, reject) =>
    {
        // First, create range entries for each reading element
        createRanges()
            .then((ids) =>
            {
                if (ids.length < 3)
                {
                    reject("Insufficient ranges generated.");
                    return;
                }

                db.run(`INSERT INTO devices (id, name, ownerId, temperatureRangeId, humidityRangeId, lightRangeId) VALUES ('${id}', '${name}', '${ownerId}', ${ids[0]}, ${ids[1]}, ${ids[2]});`,
                    (err) =>
                    {
                        if (err)
                        {
                            reject(err);
                            return;
                        }

                        resolve();
                    }
                );
            })
            .catch((err) =>
            {
                reject(err);
            })
    })
}

function addReading(deviceId, temperature, humidity, light, timestamp)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT COUNT(*) FROM readings WHERE deviceId='${deviceId}';`, (err, result) =>
        {
            if (err)
            {
                reject(err);
                return;
            }

            if (!result)
            {
                reject("Failed to get readings count");
            }

            var count = result['COUNT(*)'];

            if (count >= SETTINGS.READINGS_PER_DEVICE)
            {
                // Readings at capacity, overwrite the oldest reading
                // First, get the oldest reading
                db.get(`SELECT * FROM readings WHERE deviceId='${deviceId}' ORDER BY timestamp;`,
                    (err, oldestReading) =>
                    {
                        if (err)
                        {
                            console.log("Select failed")
                            reject(err);
                            return;
                        }

                        if (!oldestReading)
                        {
                            reject("Could not insert reading, no oldest reading found.");
                            return;
                        }

                        // Now replace the contents of this reading with the new one
                        db.run(`UPDATE readings SET temperature=${temperature}, humidity=${humidity}, light=${light}, timestamp=${timestamp} WHERE deviceId='${deviceId}' AND timestamp=${oldestReading.timestamp};`,
                            (err) =>
                            {
                                if (err)
                                {
                                    reject(err);
                                    return;
                                }

                                resolve();
                            });
                    })
            }
            else
            {
                // Still room for new readings, just insert
                db.run(`INSERT INTO readings (deviceId, temperature, humidity, light, timestamp) VALUES ('${deviceId}', '${temperature}', '${humidity}', '${light}', '${timestamp}');`,
                    (err) =>
                    {
                        if (err)
                        {
                            reject(err);
                        }

                        resolve();
                    }
                );
            }
        })
    })
}

async function addRange(dangerLow, dangerHigh, warningLow, warningHigh)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`INSERT INTO ranges (dangerLow, dangerHigh, warningLow, warningHigh) VALUES ('${dangerLow}', '${dangerHigh}', '${warningLow}', '${warningHigh}');`,
            function(err)
            {
                if (err)
                {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            }
        );
    });
}

async function createRanges()
{
    // Add three ranges, and return their ID's
    return await Promise.all([
        addRange(DEFAULT_DANGER_LOW, DEFAULT_DANGER_HIGH, DEFAULT_WARNING_LOW, DEFAULT_WARNING_HIGH),
        addRange(DEFAULT_DANGER_LOW, DEFAULT_DANGER_HIGH, DEFAULT_WARNING_LOW, DEFAULT_WARNING_HIGH),
        addRange(DEFAULT_DANGER_LOW, DEFAULT_DANGER_HIGH, DEFAULT_WARNING_LOW, DEFAULT_WARNING_HIGH)]);

}

function addFeeder(id, name, ownerId)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`INSERT INTO feeders (id, name, ownerId) VALUES ('${id}', '${name}', '${ownerId}');`,
            function(err)
            {
                if (err)
                {
                    reject(err);
                    return;
                }
                resolve(true);
            }
        );
    });
}

/**
 * Retrieve
 */
function getUser(username)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM users WHERE name = '${username}';`,
            (err, user) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve(user);
            })
    })
}

function getUserFromId(userId)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM users WHERE id = '${userId}';`,
            (err, user) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve(user);
            })
    })
}

function getDevice(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM devices WHERE id = ${deviceId};`,
            (err, device) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }
                resolve(device);
            })
    });
}

function getDevices(userId)
{
    return new Promise((resolve, reject) =>
    {
        db.all(`SELECT id, name FROM devices WHERE ownerId = ${userId};`,
            (err, rows) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve(rows);
            })
    })
}

function getDeviceOwner(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT ownerId FROM devices WHERE id = ${deviceId};`,
            (err, result) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                if (!result || !result.ownerId)
                {
                    reject("Failed to find device.");
                    return;
                }

                resolve(result.ownerId);
            })
    });
}

function getReadings(deviceId, numReadings)
{
    return new Promise((resolve, reject) =>
    {
        db.all(`SELECT * FROM readings WHERE deviceId='${deviceId}' ORDER BY timestamp DESC LIMIT ${numReadings};`,
            (err, rows) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }
                resolve(rows);
            })
    })
}

function getRange(id)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM ranges WHERE id=${id};`,
            (err, range) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve(range);
            })
    })
}

async function getRanges(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT temperatureRangeId, humidityRangeId, lightRangeId FROM devices WHERE id='${deviceId}';`,
            (err, device) =>
            {
                if (err)
                {
                    console.log("Device select error")
                    reject(err);
                    return;
                }

                // Now look up the values of each range ID
                try
                {
                    Promise.all([
                        getRange(device.temperatureRangeId),
                        getRange(device.humidityRangeId),
                        getRange(device.lightRangeId)
                    ]).then((results) =>
                        {
                            if (results.length < 3)
                            {
                                reject("Insufficent ranges found.")
                                return;
                            }

                            resolve({
                                temperatureRange: results[0],
                                humidityRange: results[1],
                                lightRange: results[2]
                            })
                        })
                        .catch((err) =>
                        {
                            reject(err);
                        })

  
                }
                catch (err)
                {
                    reject(err);
                }
            })
    });
}

function getFeeders(userId)
{
    return new Promise((resolve, reject) =>
    {
        db.all(`SELECT id, name FROM feeders WHERE ownerId = ${userId};`,
            (err, rows) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve(rows);
            })
    })
}

async function getFeederOwner(id)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT ownerId FROM feeders WHERE id='${id}';`,
            (err, ownerId) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }
                resolve(ownerId);
            })
    })
}

/**
 * Modify
 */
function changeUserPassword(username, newSalt, newHash)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`UPDATE users SET salt='${newSalt}', hash='${newHash}' WHERE name='${username}';`,
            (err) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve();
            })
    })
}

function updateRange(id, dangerLow, dangerHigh, warningLow, warningHigh)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`UPDATE ranges SET dangerLow=${dangerLow}, dangerHigh=${dangerHigh}, warningLow=${warningLow}, warningHigh=${warningHigh} WHERE id=${id};`,
            (err) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve();
            })
    })
}

function updateRanges(deviceId, temperatureRange, humidityRange, lightRange)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT temperatureRangeId, humidityRangeId, lightRangeId FROM devices WHERE id='${deviceId}';`,
            (err, device) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                Promise.all([
                    updateRange(device.temperatureRangeId, temperatureRange.dangerLow, temperatureRange.dangerHigh, temperatureRange.warningLow, temperatureRange.warningHigh),
                    updateRange(device.humidityRangeId, humidityRange.dangerLow, humidityRange.dangerHigh, humidityRange.warningLow, humidityRange.warningHigh),
                    updateRange(device.lightRangeId, lightRange.dangerLow, lightRange.dangerHigh, lightRange.warningLow, lightRange.warningHigh)
                ]).then(() =>
                {
                    resolve();
                }).catch((err) => reject(err));
            });
    })
}

function updateToken(userId, newToken)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`UPDATE users SET token='${newToken}' WHERE id=${userId};`,
            (err) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve();
            })
    })
}

/**
 * Deletion
 */
function deleteUser(userId)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`DELETE FROM users WHERE id=${userId};`,
            (err) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve();
            });
    });
}

function deleteDevice(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        deleteReadings(deviceId)
            .then(() =>
            {
                deleteRanges(deviceId)
                    .then(() =>
                    {
                        db.run(`DELETE FROM devices WHERE id='${deviceId}';`,
                            (err) =>
                            {
                                if (err)
                                {
                                    reject(err);
                                    return;
                                }
                
                                resolve();
                            });
                    })
                    .catch((err) => reject(err));
            })
            .catch((err) => reject(err));
    });
}

function deleteReadings(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`DELETE FROM readings WHERE deviceId='${deviceId}';`,
            (err) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                resolve();
            });
    });
}

function deleteRange(id)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`DELETE FROM ranges WHERE id=${id};`, (err) =>
        {
            if (err)
            {
                reject(err);
                return;
            }

            resolve();
        })
    })
}

function deleteRanges(deviceId)
{
    return new Promise((resolve, reject) =>
    {
        // Find the IDs of each range for this device
        db.get(`SELECT temperatureRangeId, humidityRangeId, lightRangeId FROM devices WHERE id='${deviceId}';`,
            (err, device) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                // Delete ranges
                Promise.all([
                    deleteRange(device.temperatureRangeId),
                    deleteRange(device.humidityRangeId),
                    deleteRange(device.lightRangeId)
                ]).then(() =>
                {
                    resolve();
                }).catch((err) =>
                {
                    reject(err);
                })
            })
    })
}

function deleteFeeder(id)
{
    return new Promise((resolve, reject) =>
    {
        db.run(`DELETE FROM feeders WHERE id=${id};`, (err) =>
        {
            if (err)
            {
                reject(err);
                return;
            }

            resolve();
        })
    })
}

function printTable(table)
{
    db.all(`SELECT * FROM ${table}`, (err, rows) =>
    {
        if (err)
        {
            console.log(err);
            return
        }
        console.log(table + ":")
        console.log(rows);
    })
}

exports.connect = connect;
exports.addUser = addUser;
exports.addDevice = addDevice;
exports.addReading = addReading;
exports.addFeeder = addFeeder;
exports.getUser = getUser;
exports.getUserFromId = getUserFromId;
exports.getDeviceOwner = getDeviceOwner;
exports.getDevice = getDevice;
exports.getDevices = getDevices;
exports.getReadings = getReadings;
exports.getRanges = getRanges;
exports.getFeeders = getFeeders;
exports.getFeederOwner = getFeederOwner;
exports.changeUserPassword = changeUserPassword;
exports.updateRanges = updateRanges;
exports.updateToken = updateToken;
exports.deleteUser = deleteUser;
exports.deleteDevice = deleteDevice;
exports.deleteReadings = deleteReadings;
exports.deleteFeeder = deleteFeeder;

// debug
exports.printTable = printTable;