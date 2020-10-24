var express = require('express'),
    http = require('http'),
    fs = require('fs'),
    SerialPort = require('serialport'),
    url = require('url'),
    sessions = require('client-sessions'),
    crypto = require('crypto'),
    db = require('./db/db')

// Configuration settings
const SETTINGS = require(__dirname + "/settings.json");

const app = express();
const server = http.createServer(app);

startServer();

function startServer()
{
    var secretStr = process.env.SECRET_STR ? process.env.SECRET_STR : "qwdvboiuygfc345tf3df789";
    app.use(sessions({
        cookieName: 'session',
        secret: secretStr,
        duration: 3 * 24 * 60 * 60 * 1000,       // 3 days
        activeDuration: 3 * 24 * 60 * 60 * 1000, //3 days
    }));

    // Body parser, collects incoming data and puts it in the req's body key`
    app.use((req, res, next) =>
    {
        var data = '';
        req.on('data', (d) => {data += d;});
        req.on('end', () => {
            req.body = data;
            next();
        });
    });

    // Validate user session
    app.use((req, res, next) => 
    {
        if (req.session && req.session.username)
        {
            req.username = req.session.username;
        }

        next();
    });

    // Handle login attempts
    app.post('/login', (req, res) =>
    {
        body = JSON.parse(req.body);
        if (!body.username || !body.password)
        {
            // Insufficient data in request
            sendError(res);
            return;
        }

        db.getUser(body.username).then((user) =>
        {
            if (user == null)
            {
                sendObject(res, {success: false, reason: "User does not exist"});
                return;
            }

            if (verifyPassword(user.salt, user.hash, body.password))
            {
                // Login successful
                console.log("User '" + body.username + "' logged in");
                sendObject(res, {success: true});
            }
            else
            {
                // Bad password
                sendObject(res, {success: false, reason: "Incorrect password"});
            }
        })
        .catch((err) =>
        {
            console.log("Failed to get user:")
            console.log(err);
            sendObject(res, {success: false, reason: "Server error"});
        });
    });

    // Handle new user requests
    app.post('/newuser', (req, res) =>
    {
        body = JSON.parse(req.body);

        if (!body.username || !body.password)
        {
            // Insufficient data in request
            sendErrorsendError(res);
            return;
        }

        // Encrypt password
        encryptedPassword = encryptPassword(body.password);

        // Attempt to add new user to database
        db.addUser(body.username, encryptedPassword.salt, encryptedPassword.hash)
        .then((userAlreadyExists) =>
        {
            if (userAlreadyExists)
            {
                sendObject(res, {success: false, reason: "User already exists"});
            }
            else
            {
                if (body.username)
                {
                    req.session.username = body.username;
                }

                console.log("New user '" + body.username + "' successfully added");
                db.listUsers();

                sendObject(res, {success: true});
            }
        })
        .catch((err) =>
        {
            console.log("Could not add new user.")
            console.log(err);
            sendObject(res, {success: false, reason: "Server error"});
        });
    });

    app.get('/logout', (req, res) =>
    {
        req.session.reset();
        res.redirect('/login');
    });

    // Direct all other requests to file requests
    app.all('*', (req, res, next) =>
    {
        // Extract the path from the request, and add it to the angular build directory
        var uri = url.parse(req.url);
        var path = __dirname + '/../dist/VeranusWebApp' + uri.pathname

        // Extract the file type
        var split = uri.pathname.split('.');
        var fileType = split[split.length - 1];

        if (fileType === "jpg") fileType = "image/png";
        else if (fileType === "js") fileType = "text/javascript";
        else fileType = "text/" + fileType;
    
        // Send file if it exists
        if(uri.pathname !== '/' && fs.existsSync(path)){
            sendFile(res, path, fileType);
        }
        else{
            sendFile(res, __dirname + '/../dist/VeranusWebApp/index.html');
        }
    });

    // Launch server
    server.listen(SETTINGS.serverPort, () =>
    {
        console.log("Listening on port: " + SETTINGS.serverPort);
        if (!process.env.SECRET_STR)
        {
            console.log("WARNGING: sessions not encrypted")
        }
    });

    db.testConnection();
}

function sendFile(res, filename, type)
{
    type = type || 'text/html'
    fs.readFile(filename, function (error, content) {
        if (error) {
            console.log(error);
        }
        res.writeHead(200, { 'Content-type': type });
        res.end(content, 'utf-8');

    })
}

function sendObject(res, object)
{
    res.writeHead(200, {'Conent-type': 'application/json'});
    res.end(JSON.stringify(object));
}

function sendError(res)
{
    res.writeHead(400)
    res.end();
}

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