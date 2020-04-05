const express = require('express');  
const app = express();  
const server = require('http').createServer(app);  
const io = require('socket.io')(server);

const boxCount = 0;

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname));

app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

// The io.on is listening for connections. When it receives one it will report to the console client connected....
// The 'client.on('join') will wait for a message from the client for join. It will then log it to the console.
io.on('connection', function(client) {
    console.log('client connected...');

    client.on('join', function(data) {
        console.log(data);

        //talk to client
        client.emit('messages', 'hello from server');

        let boxCount = 0;
        for (let i = 0; i < 100; i++)
        {
            client.emit('broad', 'hello from server');
        }

        //broadcast client messages to other clients
        client.on('messages', function(data) {
            if (boxCount >= 1000)
            {
                boxCount = 0;
                client.emit('clearBox', 'box cleared')
            }
            boxCount++;
            console.log('message from client received');
            client.emit('broad', data); 
            client.broadcast.emit('broad',data);
            console.log('message from client has been broadcasted to other clients');
        });

    });
});

server.listen(3000);