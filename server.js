const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

const Gpio = require('onoff').Gpio
const button = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 })

let isRecording = false

const signalCountFile = 'bottle_count.csv'
const databaseFile = 'database.csv'

const perUnitTime = 60000
const bracket = []

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

const databaseHeader = {
  fillingLine: '',
  product: '',
  startTimestamp: '',
  endTimestamp: '',
  count: '',
  timeElapsed: '',
  averageUnitPerUnitTime: '',
  bracketSizeRunningAverage: 5
}

app.use(express.static(__dirname))
app.use(express.static(path.join(__dirname, '/database.csv')))
app.use(express.static(path.join(__dirname, '/node_modules')))
app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '/index.html'))
})

fs.access(signalCountFile, (err) => {
  if (err) {
    fs.appendFile(signalCountFile, databaseHeader.count, function (err) {
      if (err) throw err
    })
  } else {
    databaseHeader.count = fs.readFileSync(signalCountFile)
  }
})

fs.access(databaseFile, (err) => {
  if (err) {
    fs.appendFile(databaseFile, '', function (err) {
      if (err) throw err
    })
  }
})

function updateDatabaseHeader () {
  io.emit('updateDatabaseHeader', databaseHeader)
}

function writeToDatabase (data) {
  fs.appendFile(databaseFile, data + '\n', function (err) {
    if (err) throw err
  })
}

function incrementSignalCount () {
  databaseHeader.count++
  fs.writeFile(signalCountFile, databaseHeader.count, function (err) {
    if (err) throw err
  })
}

function updateBracket (timeStamp) {
  if (bracket.length >= databaseHeader.bracketSizeRunningAverage + 1) {
    bracket.shift()
  }
  bracket.push(timeStamp)
}

function deltaTimestamp (initial, final) {
  return (new Date(final) - new Date(initial))
}

function runningAverage () {
  return (databaseHeader.bracketSizeRunningAverage * perUnitTime / deltaTimestamp(bracket[0], bracket[databaseHeader.bracketSizeRunningAverage]))
}

function formatTimestamp (timeStamp) {
  const dateTime = new Date(timeStamp)
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
  updateDatabaseHeader()
  client.on('start', function () {
    isRecording = true
    databaseHeader.startTimestamp = new Date()
    updateDatabaseHeader()
  })
  client.on('stop', function () {
    isRecording = false
    databaseHeader.endTimestamp = new Date()
    updateDatabaseHeader()
  })
})

button.watch((err) => {
  if (err) throw err
  if (isRecording) {
    const timeStamp = new Date()
    incrementSignalCount()
    updateDatabaseHeader()
    updateBracket(timeStamp)
    writeToDatabase(String(databaseHeader.count + ',' + Math.round(runningAverage()) + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + Number(timeStamp.getMonth() + 1) + ',' + timeStamp.getFullYear()) + ',' + timeStamp)
    pushToClients('[ ' + databaseHeader.count + ' ]' + '[ ' + Math.round(runningAverage()) + ' ]' + formatTimestamp(timeStamp))
  }
})

process.on('SIGINT', _ => {
  button.unexport()
})

server.listen(3000)
