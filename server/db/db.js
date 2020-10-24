const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'veranus';

const userCollectionName = 'users';

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

           resolve(mongoConnection);
        });
    });
}

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
        connect().then((connection) =>
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

        }).catch((err) =>
        {
            console.log("Failed to connect to DB:");
            reject(err);
        })
    })
}

function getUser(username)
{
    return new Promise ((resolve, reject) =>
    {
        connect().then((connection) =>
        {
            coll = getCollection(connection, userCollectionName);
            coll.find({username: username}).toArray((err, results) =>
            {
                if (err) console.error(err);
                if (results.length <= 0) resolve(null);
                resolve(results[0])
            })
        }).catch((err) =>
        {
            console.log("Failed to get user.");
            console.log(err);
            reject(err);
        })
    });
}

function listUsers()
{
    connect().then((connection) =>
    {
        coll = getCollection(connection, userCollectionName);
        coll.find({}).forEach((item) =>
        {
            console.log(item);
        });
    }).catch((err) =>
    {
        console.log("Failed to add user to DB:");
        console.log(err);
    })
}

function testConnection()
{
    connect().then((conn) =>
    {
        console.log("Database connection test PASSED");
    }).catch((err) => 
    {
        console.log("Database connection test FAILED");
        console.error(err);
    });
}

exports.testConnection = testConnection;
exports.addUser = addUser;
exports.getUser = getUser;

// debug
exports.listUsers = listUsers;