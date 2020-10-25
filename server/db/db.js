const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'veranus';

const userCollectionName = 'users';
const deviceCollectionName = 'devices';

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
                console.log(err);
                resolve(false);
                return;
            }
            connection = mongoConnection;
            resolve(true);
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
            if (err) console.error(err);
            if (results.length <= 0) resolve(null);
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

function addDeviceToUser(username, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        getUser(username).then((user) =>
        {
            if (!user)
            {
                // User does not exist
                reject("User does not exist");
                return;
            }

            // Check if the device already exists for this user
            for (var i=0; i<user.devices.length; i++)
            {
                if (user.devices[i] === hardwareId)
                {
                    resolve();
                    return;
                }
            }

            coll = getCollection(connection, userCollectionName);
            coll.findOneAndUpdate(
                {username: username},
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
        });
    })
}

function addDevice(username, hardwareId)
{
    return new Promise((resolve, reject) =>
    {
        // First, create new device document
        getDevice(hardwareId).then((device) =>
        {
            if (!device)
            {
                newDevice = 
                {
                    hardwareId: hardwareId,
                    readings: []
                };

                // Device does not exist yet, create one
                coll = getCollection(connection, deviceCollectionName);
                coll.insertOne(newDevice, (err, result) =>
                {
                    if (err)
                    {
                        console.log("Failed to add new device")
                        reject(err);
                        return;
                    }

                    // Now add the new device to the user's device list
                    addDeviceToUser(username, hardwareId)
                        .then(() => resolve())
                        .catch((err) => reject(err));
                })
            }
            else
            {
                // Device exists, just add it to the user's list
                addDeviceToUser(username, hardwareId)
                    .then(() => resolve())
                    .catch((err) => reject(err));
            }
        })
        .catch((err) =>
        {
            reject(err);
        })
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

// ---------------------------------------------------------------------------------------------------------------------------------------------

exports.connect = connect;
exports.addUser = addUser;
exports.getUser = getUser;
exports.changePassword = changePassword;
exports.getDevice = getDevice;
exports.addDevice = addDevice;
exports.listDevices = listDevices;

// debug
exports.listUsers = listUsers;