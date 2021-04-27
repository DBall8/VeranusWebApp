const { resolve } = require('path');

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'veranus';

const userCollectionName = 'users';
const deviceCollectionName = 'devices';

const MAX_READINGS_PER_DEVICE = 1000;

connection = null;

function getCollection(connection, collectionName)
{
    return connection.db(dbName).collection(collectionName);
}

function connect()
{
    return new Promise((resolve, reject) =>
    {
        MongoClient.connect(url,  { useUnifiedTopology: true }, (err, mongoConnection) =>
        {
            if (err)
            {
                reject(err);
                return;
            }
            connection = mongoConnection;
            resolve();
        });
    });
}

// USER FUNCTIONS ------------------------------------------------------------------------------------------------------------------------
function addUser(username, salt, hash)
{
    userObj = 
    {
        username: username,
        salt: salt,
        hash: hash,
        devices: []
    };

    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.countDocuments({username: username}, (err, count) =>
        {
            if (err)
            {
                console.error("Failed to check for existing user");
                reject(err);
                return;
            }

            if (count > 0)
            {
                // User already exists
                resolve(true);
                return;
            };

            coll.insertOne(userObj, (err, result) =>
            {
                if (err)
                {
                    console.log("Failed to insert user:");
                    reject(err);
                }
                else
                {
                    // User added and did not already exist
                    resolve(false);
                }
            });
        })
    })
}

function getUser(username)
{
    return new Promise ((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.find({username: username}).toArray((err, results) =>
        {
            if (err)
            {
                console.error(err);
                reject(err);
                return;
            }

            if (results.length <= 0)
            {
                resolve(null);
                return;
            }

            resolve(results[0])
        })
    });
}

function getUserById(userId)
{
    return new Promise ((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.find({_id: ObjectId(userId)}).toArray((err, results) =>
        {
            if (err)
            {
                reject(err);
                return;
            }

            if (results.length <= 0)
            {
                resolve(null);
                return;
            }

            resolve(results[0])
        })
    });
}

function changePassword(username, salt, hash)
{
    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.findOneAndUpdate({username: username},
                                {$set: {salt: salt, hash: hash}},
                                (err, result) =>
        {
            if (err)
            {
                console.log("Failed to update password.");
                reject(err);
                return;
            }

            resolve();
        })
    });
}

function getDevices(username)
{
    return new Promise((resolve, reject) =>
    {
        getUser(username)
            .then((user) =>
            {
                if (!user)
                {
                    reject("User does not exist");
                    return;
                }

                resolve(user.devices);
            })
            .catch((err) =>
            {
                console.log("Failed to retrieve user: " + username);
                reject(err);
            })
    })
    
}

function listUsers()
{
    coll = getCollection(connection, userCollectionName);
    coll.find({}).forEach((item) =>
    {
        console.log(item);
    });
}
// ---------------------------------------------------------------------------------------------------------------------------------------------

// Devices -------------------------------------------------------------------------------------------------------------------------------------
function getDevice(hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, deviceCollectionName);
        coll.findOne({hardwareId: hardwareId}, (err, result) =>
        {
            if (err)
            {
                console.log(err);
                reject(err);
                return;
            }

            resolve(result);
        })
    });
}

function doesDeviceExist(userId, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        getUserById(userId)
            .then((user) =>
            {
                if (!user)
                {
                    // ID already exists in the user's list
                    reject("User does not exist");
                    return;
                }

                // Check if the device already exists for this user
                for (var i=0; i<user.devices.length; i++)
                {
                    if (user.devices[i] === hardwareId)
                    {
                        // Resolve with true to indicate the device already exists for this user
                        resolve(true);
                        return;
                    }
                }

                // Now check if the device itself already exists
                getDevice(hardwareId)
                    .then((device) =>
                    {
                        if (device)
                        {
                            // Device already exists
                            resolve(true);
                            return;
                        }

                        // Device does not exist
                        resolve(false);
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
}

function addDeviceToUser(userId, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.findOneAndUpdate(
            {_id: ObjectId(userId)},
            {$push: {devices: hardwareId}},
            (err, result) =>
        {
            if (err)
            {
                console.log("Failed to add device");
                reject(err);
                return;
            }

            resolve();
        })
    })
}

function removeDeviceFromUser(userId, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.findOneAndUpdate(
            {_id: ObjectId(userId)},
            {$pull: {devices: {$in: [hardwareId]} }},
            (err, result) =>
        {
            if (err)
            {
                console.log("Failed to add device");
                reject(err);
                return;
            }

            resolve();
        })
    })
}

function addDevice(ownerId, deviceName, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        doesDeviceExist(ownerId, hardwareId)
            .then((deviceExists) =>
            {
                if (deviceExists)
                {
                    // Device already exists, do nothing
                    resolve();
                    return;
                }

                // First, add the device ID to its owner's device ID list
                addDeviceToUser(ownerId, hardwareId)
                    .then(() =>
                    {
                        newDevice = 
                        {
                            name: deviceName,
                            ownerId: ownerId,
                            hardwareId: hardwareId,
                            readings: []
                        };

                        // Device does not exist yet, create one
                        coll = getCollection(connection, deviceCollectionName);
                        coll.insertOne(newDevice, (err, result) =>
                        {
                            if (err)
                            {
                                removeDeviceFromUser(userId, hardwareId)
                                    .then(() => reject("Failed to create new device"))
                                    .catch(reject);
                                return;
                            }

                            // Success!
                            resolve();
                        })
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
}

function listDevices(username)
{
    coll = getCollection(connection, userCollectionName);
    coll.find({username: username}).forEach((item) =>
    {
        item.devices.forEach((device) => console.log(device));
    })
}

function addReading(hardwareId, reading)
{
    return new Promise((resolve, reject) =>
    {
        coll = getCollection(connection, deviceCollectionName);

        coll.findOne({hardwareId: hardwareId},
            (err, device) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                if (!device)
                {
                    // If device does not exist, just quit
                    resolve(false);
                    return;
                }

                if (device.readings.length >= MAX_READINGS_PER_DEVICE)
                {
                    // First remove a reading to make room for a new reading
                    // Then, if successful, add he new reading
                    coll.findOneAndUpdate(
                        {hardwareId: hardwareId},
                        {$pop: {readings: -1}},
                        (err) =>
                        {
                            if (err)
                            {
                                console.log("Failed to remove reading to fit a new one for id: " + hardwareId);
                                reject(err);
                            }
                            else
                            {
                                // Add new reading
                                coll.findOneAndUpdate(
                                    {hardwareId: hardwareId},
                                    {$push: {readings: reading}},
                                    (err) =>
                                    {
                                        if (err)
                                        {
                                            console.log("Failed to add new reading to ID: " + hardwareId);
                                            reject(err);
                                        }
                                        else
                                        {
                                            resolve(true);
                                        }
                                    }
                                )
                            }
                        })
                }
                else
                {
                    // There is still space for more readings, so just add it
                    coll.findOneAndUpdate(
                        {hardwareId: hardwareId},
                        {$push: {readings: reading}},
                        (err) =>
                        {
                            if (err)
                            {
                                console.log("Failed to add new reading to ID: " + hardwareId);
                                reject(err);
                            }
                            else
                            {
                                resolve(true);
                            }
                        }
                    )
                }
            });
    });
}

function listReadings(hardwareId)
{
    coll = getCollection(connection, deviceCollectionName)
    coll.find({hardwareId: hardwareId}).forEach((item) =>
    {
        for (var i=0; i<item.readings.length; i++)
        {
            console.log("" + i + ": " + JSON.stringify(item.readings[i]))
        }
    })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

exports.connect = connect;
exports.addUser = addUser;
exports.getUser = getUser;
exports.changePassword = changePassword;
exports.getDevices = getDevices;
exports.getDevice = getDevice;
exports.addDevice = addDevice;
exports.listDevices = listDevices;
exports.addReading = addReading;
exports.listReadings = listReadings;;

// debug
exports.listUsers = listUsers;