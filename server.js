const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

const databaseFile = 'database.csv'

let bracket = new Array
const bracketSize = 6

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

// serve static files
app.use(express.static(__dirname))
app.use(express.static(path.join(__dirname, '/node_modules')))
app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '/index.html'))
})

function writeToDatabase(data) {
  if (!data.includes(serverGreeting)) {
    fs.appendFile(databaseFile, data + '\n', function (err) {
      if (err) throw err;
      console.log('added entry to database')
    })
  }
}

function updateBracket(data){
  if (bracket.length >= bracketSize)
  {
    bracket.shift()
  }
  bracket.push(data)
  // for (let i = 0; i < bracket.length; i++)
  //   console.log(bracket[i]);
}

function delta(){
  const timeStamp1 = new Date(bracket[0])
  const timeStamp2 = new Date(bracket[bracketSize-1])
  const time = (timeStamp2 - timeStamp1)
  return time
}

function average(){
  return ((bracketSize-1)*60000/delta())
}

function formatDateTime(data) {
  const dateTime = new Date(data)
  const formatedDate = `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
  const formatedTime = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
  return new String('[ ' + formatedTime + ' - ' + formatedDate + ' ]')
}

// The io.on is listening for connections. When it receives one it will report to the console client connected....
// The 'client.on('join') will wait for a message from the client for join. It will then log it to the console.
io.on('connection', function (client) {
  client.on('join', function (data) {
    // log client greeting
    console.log(data)

    function pushToClients(data) {
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

    client.on('signal', function (data) {
      const timeStamp = new Date(data)
      updateBracket(data)
      console.log(average())
      writeToDatabase(new String('bottle' + ',' + Math.round(average()) + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + new Number(timeStamp.getMonth()+1) + ',' + timeStamp.getFullYear()));
      pushToClients('[ bottle ]' + '[ ' + Math.round(average()) + ' ]' + formatDateTime(data))
    })
  })
})

server.listen(3000)
console.log('http://192.168.2.219:3000')
