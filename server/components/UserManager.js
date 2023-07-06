var crypto = require('crypto'),
    server = require('./ServerUtilities'),
    db = require('./db-sqlite')

function encryptPassword(rawPassword)
{
    // generate a 128 byte salt
    var salt = crypto.randomBytes(128).toString('base64');

    // create a hash with the salt
    var hash = crypto.createHmac('sha512', salt);

    // update the hash with the password
    hash.update(rawPassword);

    // Return the encrypted password in base64 form
    return {
        salt: salt,
        hash: hash.digest('base64')
    }
}

function verifyPassword(salt, hash, password)
{
    var confirmHash = crypto.createHmac('sha512', salt);
    confirmHash.update(password);

    return (confirmHash.digest('base64') == hash);
}

function attemptLogin(req, res)
{
    /**
     * Input:
     * {
     *      username: string,
     *      password: string
     * }
     * 
     * Output:
     * {
     *      success: boolean,
     *      reason: string
     * }
     */
    var body = JSON.parse(req.body);
    if (!body.username || !body.password)
    {
        // Insufficient data in request
        server.sendError(res);
        return;
    }

    db.getUser(body.username).then((user) =>
    {
        if (user == null)
        {
            server.sendObject(res, {success: false, reason: "User does not exist"});
            return;
        }

        if (verifyPassword(user.salt, user.hash, body.password))
        {
            // Login successful
            req.session.username = body.username;
            req.session.userId = user.id;

            // Send response
            console.log("User '" + body.username + "' logged in");
            server.sendObject(res, {success: true});
        }
        else
        {
            // Bad password
            server.sendObject(res, {success: false, reason: "Incorrect password"});
        }
    })
    .catch((err) =>
    {
        console.log("Failed to get user:")
        console.log(err);
        serverU.sendObject(res, {success: false, reason: "Server error"});
    });
}

function attemptNewUser(req, res)
{
    /**
     * Input:
     * {
     *      username: string,
     *      password: string
     * }
     * 
     * Output:
     * {
     *      success: boolean,
     *      reason: string
     * }
     */
    var body = JSON.parse(req.body);

    if (!body.username || !body.password)
    {
        // Insufficient data in request
        server.sendError(res);
        return;
    }

    // Encrypt password
    var encryptedPassword = encryptPassword(body.password);

    // Attempt to add new user to database
    db.addUser(body.username, encryptedPassword.salt, encryptedPassword.hash)
    .then((userAlreadyExists) =>
    {
        if (userAlreadyExists)
        {
            server.sendObject(res, {success: false, reason: "User already exists"});
        }
        else
        {
            db.getUser(body.username)
                .then((user) =>
                {
                    if (!user || !user.id)
                    {
                        server.sendError(res);
                        return;
                    }

                    // Add user ID to the session cookie
                    req.session.userId = user.id;
                    req.session.username = body.username;

                    // Send success message
                    console.log("New user '" + body.username + "' successfully added");
                    server.sendObject(res, {success: true});

                })
                .catch((err) =>
                {
                    server.sendError(err);
                });
        }
    })
    .catch((err) =>
    {
        console.log("Could not add new user.")
        console.log(err);
        server.sendObject(res, {success: false, reason: "Server error"});
    });
}

function logout(req, res)
{
    req.session.reset();
    res.redirect('/login');
}

/*
 * POST request with body
 * {
 *      token: string
 * }
 */
function updateUserToken(req, res)
{
    if (!req.userId || !req.body) { server.sendInputError(res); }

    var body = JSON.parse(req.body);

    if (!body || !body.token) { server.sendInputError(res); }

    db.updateToken(req.userId, body.token).then(() =>
    {
        console.log("Token for user " + req.userId + " successfully updated.")
        server.sendObject(res, JSON.stringify({success: true}));
    })
    .catch((err) =>
    {
        console.log("Failed to update user's token:");
        console.log(err);
        server.sendInternalError(res);
    })
}

function getUserToken(userId)
{
    return new Promise((resolve, reject) =>
    {
        db.getUserFromId(userId)
        .then((user) =>
        {
            resolve(user.token);
        })
        .catch((err) =>
        {
            reject(err);
        })
    });
}

exports.attemptLogin = attemptLogin;
exports.attemptNewUser = attemptNewUser;
exports.logout = logout;
exports.updateUserToken = updateUserToken;
exports.getUserToken = getUserToken;