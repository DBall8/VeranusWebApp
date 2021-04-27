const { EventEmitter } = require('events');
var SerialPort = require('serialport'),
    Readline = require('@serialport/parser-readline');

const EXPECTED_MSG_LENGTH = 15;
const EXPECTED_FAILURE_LENGTH = 1;

const START_CODE = 0x7f;
const PROBE_ID_INDEX = 1;
const LIGHT_INDEX = 2;
const TEMP_INDEX = 6;
const HUMIDITY_INDEX = 10;
const END_CODE = 0xff;

const UPDATE_TIME = 1000 * 60 * 5; // 5 minutes
const FAIL_UPDATE_COUNTS = 1;
const SUCCESS_UPDATE_COUNTS = 3;

const DEBUG = true;

var serial_ = null;
var dataBuffer_ = [];

var nextDevice_ = 0;
var numDevices_ = 0;
var deviceUpdates_ = [];

var dataReceivedEvent = new EventEmitter();

function start(comPort, baudRate, devices, numDevices)
{
    // Create array for tracking when each device needs to update
    for (var i=0; i<numDevices; i++)
    {
        var aDevice =
        {
            probeId: devices[i],
            updateCount: 0
        };

        deviceUpdates_.push(aDevice);
    }

    numDevices_ = numDevices;
    nextDevice_ = numDevices;

    // Open a serial connection
    serial_ = new SerialPort(
        comPort,
        {
            baudRate: baudRate
        },
        (err) =>
            {
                if (err)
                {
                    console.log("Failed to open serial port on " + comPort);
                    console.log(err);
                    return;
                }
        
                console.log("Serial port opened on " + comPort);
                getNextUpdate();
            }
    );

    serial_.on("data", collectIncomingData);
}

function collectIncomingData(data)
{
    // Add all incoming data to the data buffer
    // When the end code is received, parse the data
    for (var i=0; i<data.length; i++)
    {
        dataBuffer_.push(data[i]);

        if ((dataBuffer_[0] == END_CODE) ||
            (dataBuffer_.length == EXPECTED_MSG_LENGTH))
        {
            var success = parseReceivedData(dataBuffer_);
            dataBuffer_ = [];

            // Set number of update counts based on whether the update passed or failed
            deviceUpdates_[nextDevice_].updateCount = success ? SUCCESS_UPDATE_COUNTS : FAIL_UPDATE_COUNTS;
            
            // Now get the next update
            nextDevice_++;
            getNextUpdate();

            return;
        }
    }
}

function parseReceivedData(receivedData)
{
    // Convert to data buffer, to allow for the extraction of 4 byte floats
    var dataBuffer_ = Buffer.from(receivedData);

    if (dataBuffer_.length == EXPECTED_FAILURE_LENGTH)
    {
        // Receiver failed to poll the probe
        // This is an exceptable failure, probably caused by interference
        if (DEBUG) console.log("Update failed expectedly");
        return false;
    }
    else if (dataBuffer_.length == EXPECTED_MSG_LENGTH)
    {
        if ((dataBuffer_[0] != START_CODE) ||
            (dataBuffer_[EXPECTED_MSG_LENGTH-1] != END_CODE))
        {
            // Corrupted data
            console.log("Updated failed unexpectedly: " + dataBuffer_);
            return false;
        }

        probeData = 
        {
            probeId: dataBuffer_[PROBE_ID_INDEX],
            light: dataBuffer_.readFloatLE(LIGHT_INDEX),
            temperature: dataBuffer_.readFloatLE(TEMP_INDEX),
            humidity: dataBuffer_.readFloatLE(HUMIDITY_INDEX),
            timestamp: new Date().getTime()
        };

        if (DEBUG) console.log(JSON.stringify(probeData));

        dataReceivedEvent.emit("data", probeData);

        return true;
    }
    else
    {
        console.log("Updated failed unexpectedly: " + dataBuffer_);
        return false;
    }
}

function getNextUpdate()
{
    // All devices updated, set a timeout for next check
    if (nextDevice_ >= numDevices_)
    {
        nextDevice_ = 0;

        // Set timeout for next update
        setTimeout(() =>
        {
            getNextUpdate();
        },
        UPDATE_TIME);

        return;
    }

    if (deviceUpdates_[nextDevice_].updateCount <= 1)
    {
        // This device is ready to update
        var probeId = deviceUpdates_[nextDevice_].probeId;

        var requestString = "READ " + probeId + "\n";
        serial_.write(requestString);
    }
    else
    {
        // Device still has counts left, drop it by 1
        deviceUpdates_[nextDevice_].updateCount--;

        // Check for next update
        nextDevice_++;
        getNextUpdate();
    }
}

exports.start = start;
exports.dataReceivedEvent = dataReceivedEvent;

