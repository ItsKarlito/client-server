const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

const Gpio = require('onoff').Gpio
const button = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 })

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

const perUnitTime = 60000
const bracketSize = 6
const bracket = []

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

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
  return ((bracketSize - 1) * perUnitTime / delta())
}

function formatDateTime (data) {
  const dateTime = new Date(data)
  const formatedDate = `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
  const formatedTime = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
  return String('[ ' + formatedTime + ' - ' + formatedDate + ' ]')
}

function pushToClients (data) {
  if (boxCount >= boxMaxItemCount) {
    boxCount = 0
    io.emit('clearBox')
  }
  io.emit('broad', data)
  boxCount++
}

io.on('connection', function (client) {
  client.emit('broad', serverGreeting)
})

button.watch((err) => {
  if (err) throw err
  incrementSignalCount()
  const timeStamp = new Date()
  updateBracket(timeStamp)
  writeToDatabase(String(signalCount + ',' + Math.round(average()) + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + Number(timeStamp.getMonth() + 1) + ',' + timeStamp.getFullYear()) + ',' + timeStamp)
  pushToClients('[ ' + signalCount + ' ]' + '[ ' + Math.round(average()) + ' ]' + formatDateTime(timeStamp))
})

process.on('SIGINT', _ => {
  button.unexport()
})

server.listen(3000)
