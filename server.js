const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

let signalCount = 0
const signalCountFile = 'bottle_count.csv'
const databaseFile = 'database.csv'

fs.access(signalCountFile, (err) => {
  if (err) {
    fs.appendFile(signalCountFile, signalCount, function (err) {
      if (err) throw err
    })
  } else {
    signalCount = fs.readFileSync(signalCountFile)
  }
})

const bracketSize = 6
const bracket = []

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

// serve static files
app.use(express.static(__dirname))
app.use(express.static(path.join(__dirname, '/node_modules')))
app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '/index.html'))
})

function writeToDatabase (data) {
  fs.appendFile(databaseFile, data + '\n', function (err) {
    if (err) throw err
  })
}

function incrementSignalCount () {
  signalCount++
  fs.writeFile(signalCountFile, signalCount, function (err) {
    if (err) throw err
  })
}

function updateBracket (data) {
  if (bracket.length >= bracketSize) {
    bracket.shift()
  }
  bracket.push(data)
}

function delta () {
  const timeStamp1 = new Date(bracket[0])
  const timeStamp2 = new Date(bracket[bracketSize - 1])
  const time = (timeStamp2 - timeStamp1)
  return time
}

function average () {
  return ((bracketSize - 1) * 60000 / delta())
}

function formatDateTime (data) {
  const dateTime = new Date(data)
  const formatedDate = `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
  const formatedTime = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
  return String('[ ' + formatedTime + ' - ' + formatedDate + ' ]')
}

// The io.on is listening for connections. When it receives one it will report to the console client connected....
// The 'client.on('join') will wait for a message from the client for join. It will then log it to the console.
io.on('connection', function (client) {
  client.on('join', function (data) {
    // log client greeting
    console.log(data)

    function pushToClients (data) {
      if (boxCount >= boxMaxItemCount) {
        boxCount = 0
        client.emit('clearBox')
      }
      client.emit('broad', data)
      client.broadcast.emit('broad', data)
      boxCount++
      console.log('Broadcasting: ' + data)
    }

    // greet the new client
    client.emit('broad', serverGreeting)

    client.on('signal', function (data) {
      incrementSignalCount()
      const timeStamp = new Date(data)
      updateBracket(data)
      writeToDatabase(String(signalCount + ',' + Math.round(average()) + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + Number(timeStamp.getMonth() + 1) + ',' + timeStamp.getFullYear()) + ',' + timeStamp)
      pushToClients('[ ' + signalCount + ' ]' + '[ ' + Math.round(average()) + ' ]' + formatDateTime(data))
    })
  })
})

server.listen(3000)
console.log('http://192.168.2.207:3000')
