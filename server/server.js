var express = require('express'),
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    sessions = require('client-sessions'),
    db = require('./components/db-sqlite'),
    utilities = require('./components/ServerUtilities'),
    userManager = require('./components/UserManager'),
    deviceManager = require('./components/DeviceManager'),
    feederManager = require('./components/FeederManager'),
    socketControl = require('./components/SocketControl'),
    cavyCam = require('./components/CavyCam'),
    notificationManager = require('./components/NotificationManager')

// Configuration settings
const SETTINGS = require(__dirname + "/settings.json");

const app = createApp();
const server = startServer(app);
startDatabase();
socketControl.startSocket(server);
feederManager.initFeederControl(server);

function createApp()
{
    var app = express();

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

        if (req.session && req.session.userId)
        {
            req.userId = req.session.userId;
        }

        next();
    });

    // Handle user account requests
    app.post('/login', userManager.attemptLogin);                   // Existing user login attempt
    app.post('/newuser', userManager.attemptNewUser);               // Create new user attempt
    app.get('/logout', userManager.logout);                         // Log out user session
    app.post('/token', requireLogin, userManager.updateUserToken); // Update a firebase token for this user

    // Handle device requests
    app.get('/device', requireLogin, deviceManager.getDevices);       // Get list of devices for a user
    app.put('/device', requireLogin, deviceManager.addDevice);        // Add a device
    app.delete('/device', requireLogin, deviceManager.deleteDevice)   // Delete a device

    // Handle readings requests
    app.get('/readings', requireLogin, deviceManager.getReadings);    // Get list of a device's latest readings
    app.post('/update-sensor', handleNewReading);                     // Receive updates from probes at this URL

    // Handle range requests
    app.get('/ranges', requireLogin, deviceManager.getRanges);        // Get the ranges for readings for a device
    app.post('/ranges', requireLogin, deviceManager.updateRanges);    // Update the ranges for a device

    // Handle feeder requests
    app.get('/feeders', requireLogin, feederManager.getFeeders);    // Get the list of feeders for this user
    app.put('/feeder', requireLogin, feederManager.addFeeder);      // Add a new feeder for this user
    app.get('/feeder', requireLogin, feederManager.getFeederStatus);// Get the Open/closed status of a feeder
    app.post('/feeder', requireLogin, feederManager.controlFeeder); // Open or close a feeder
    app.delete('/feeder', requireLogin, feederManager.deleteFeeder);// Delete a feeder

    // Cavy cam functions
    app.get('/capture', cavyCam.handleCapture);

    app.get('/test', (req, res) =>
    {
        var response =
        {
            timestamp: new Date().getTime(),
            success: true
        };

        res.writeHead(200);
        res.end(JSON.stringify(response));
    });

    app.post('/image', deviceManager.updateImage);

    app.get('/images/*', deviceManager.getImage);

    app.get('/captures/*', (req, res) => utilities.sendFile(res, __dirname + '/../captures/image1.jpg'));

    app.delete('/image', deviceManager.removeImage);

    // Direct all other requests to file requests
    app.all('*', (req, res, next) =>
    {
        // Extract the path from the request, and add it to the angular build directory
        var uri = url.parse(req.url);
        var path = __dirname + '/../dist/VeranusWebApp' + uri.pathname

        // Extract the file type
        var split = uri.pathname.split('.');
        var fileType = split[split.length - 1];

        if (fileType === "jpg") fileType = "image/jpg";
        else if (fileType === "js") fileType = "text/javascript";
        else fileType = "text/" + fileType;
    
        // Send file if it exists
        if(uri.pathname !== '/' && fs.existsSync(path)){
            utilities.sendFile(res, path, fileType);
        }
        else{
            utilities.sendFile(res, __dirname + '/../dist/VeranusWebApp/index.html');
        }
    });

    return app;
}

function startServer(app)
{
    var server = http.createServer(app);

    // Launch server
    server.listen(SETTINGS.serverPort, () =>
    {
        console.log("Listening on port: " + SETTINGS.serverPort);
        if (!process.env.SECRET_STR)
        {
            console.log("WARNGING: sessions not encrypted")
        }
    });

    return server;
}

function startDatabase()
{
    // Launch the database
    db.connect()
        .then(() =>
        {
            console.log("DB connection SUCCEEDED");
        })
        .catch((err) =>
        {
            console.log("DB connection FAILED");
            console.log(err);
        });
}

function requireLogin(req, res, next)
{
    if (!req.session || !req.session.username || !req.session.userId)
    {
        utilities.sendObject(res, {sessionExpired: true});
    }
    else
    {
        next();
    }
}

function handleNewReading(req, res)
{
    // Parse reading
    var json = JSON.parse(req.body);
    var hardwareId = json.probeId.toString();
    var data = 
    {
        temperature: json.temperatureF,
        humidity: json.humidity,
        light: json.light,
        timestamp: new Date().getTime()
    };

    // Store reading
    deviceManager.addReading(hardwareId, data);

    // Send new reading
    socketControl.sendReading(hardwareId, data);

    // Send push notification
    notificationManager.handleReadings(hardwareId, data);

    res.end(JSON.stringify({success: true}));
}