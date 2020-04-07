const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

let sigCount = 0

// serve static files
app.use(express.static(__dirname))
app.use(express.static(__dirname + '/node_modules'))
app.get('/', function (req, res, next) {
  res.sendFile(__dirname + '/index.html')
})

// The io.on is listening for connections. When it receives one it will report to the console client connected....
// The 'client.on('join') will wait for a message from the client for join. It will then log it to the console.
io.on('connection', function (client) {
  client.on('join', function (data) {
    // log client greeting
    console.log(data)

    function pushToClients (data) {
      if (boxCount >= boxMaxItemCount) {
        boxCount = 0
        client.emit('clearBox', 'box cleared')
      }
      client.emit('broad', data)
      client.broadcast.emit('broad', data)
      boxCount++
      console.log('Broadcasting: ' + data)
    }

    // greet the new client
    client.emit('broad', serverGreeting)

    client.on('add', function () {
      sigCount++
      pushToClients(sigCount)
    })

    // broadcast client messages to other clients
    client.on('messages', function (data) {
      if (data != '') {
        pushToClients(data)
      }
    })
  })
})

server.listen(3000)
console.log('http://192.168.2.207:3000')
