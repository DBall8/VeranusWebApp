var socketIo = require('socket.io');

/**
 * List of objects of the form
 * {
 *      socket: socket.io connection,
 *      devices: number[]
 * }
 */
var activeConnections = [];

function addConnection(conn)
{
    var newConn = 
    {
        conn: conn,
        devices: []
    }

    activeConnections.push(newConn);
}

function removeConnection(connId)
{
    for (var i=0; i<activeConnections.length; i++)
    {
        if (activeConnections[i].conn.id === connId)
        {
            activeConnections.splice(i, 1);
            return;
        }
    }
}

function addDeviceToConnection(connId, device)
{
    for (var i=0; i<activeConnections.length; i++)
    {
        if (activeConnections[i].conn.id === connId)
        {
            activeConnections[i].devices.push(device);
            return;
        }
    }
}

function sendReading(deviceId, reading)
{
    activeConnections.map((element) =>
    {
        for (var i=0; i<element.devices.length; i++)
        {
            if (element.devices[i] === deviceId)
            {
                var update = 
                {
                    id: deviceId,
                    reading: reading
                }
                element.conn.emit('reading', update);
            }
        }
    })
}

function startSocket(server)
{
    var socketControl = socketIo(server);

    socketControl.on('connect', (socketConn) =>
    {
        addConnection(socketConn);

        socketConn.on('disconnect', () =>
        {
            removeConnection(socketConn.id);
        })

        socketConn.on('device', (device) =>
        {
            addDeviceToConnection(socketConn.id, device);
        })
    })
}

exports.startSocket = startSocket;
exports.sendReading = sendReading;