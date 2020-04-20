const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

const Gpio = require('onoff').Gpio
const button = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 })

let isRecording = false

const infoFile = 'info.json'
const databaseFile = 'database.csv'

const perUnitTime = 60000
const bracket = []

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

let info = {
  fillingLine: '',
  product: '',
  startTimestamp: '',
  endTimestamp: '',
  count: '',
  totalTime: '',
  averageUnitPerUnitTime: '',
  bracketSizeRunningAverage: 5
}

app.use(express.static(__dirname))
app.use(express.static(path.join(__dirname, '/database.csv')))
app.use(express.static(path.join(__dirname, '/node_modules')))
app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '/index.html'))
})

fs.access(infoFile, (err) => {
  if (err) {
    fs.appendFile(infoFile, JSON.stringify(info) + '\n', function (err) {
      if (err) throw err
    })
  } else {
    info = JSON.parse(fs.readFile(infoFile))
  }
})

fs.access(databaseFile, (err) => {
  if (err) {
    fs.appendFile(databaseFile, '', function (err) {
      if (err) throw err
    })
  }
})

function updateInfo () {
  io.emit('updateInfo', info)
  fs.writeFile(infoFile, JSON.stringify(info) + '\n', function (err) {
    if (err) throw err
  })
}

function writeToDatabase (data) {
  fs.appendFile(databaseFile, data + '\n', function (err) {
    if (err) throw err
  })
}

function updateBracket (timeStamp) {
  if (bracket.length >= info.bracketSizeRunningAverage + 1) {
    bracket.shift()
  }
  bracket.push(timeStamp)
}

function deltaTimestamp (initial, final) {
  return (new Date(final) - new Date(initial))
}

function runningAverage () {
  return (info.bracketSizeRunningAverage * perUnitTime / deltaTimestamp(bracket[0], bracket[info.bracketSizeRunningAverage]))
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
  updateInfo()
  client.on('start', function () {
    isRecording = true
  })
  client.on('stop', function () {
    isRecording = false
    info.endTimestamp = new Date()
    info.totalTime = deltaTimestamp(info.startTimestamp, info.endTimestamp)
    info.averageUnitPerUnitTime = Math.round((info.count * perUnitTime / deltaTimestamp(info.startTimestamp, info.endTimestamp)))
    updateInfo()
  })
})

button.watch((err) => {
  if (err) throw err
  if (isRecording) {
    const timeStamp = new Date()
    info.count++
    if (info.count === 1) {
      info.startTimestamp = new Date()
    }
    updateInfo()
    updateBracket(timeStamp)
    writeToDatabase(String(info.count + ',' + Math.round(runningAverage()) + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + Number(timeStamp.getMonth() + 1) + ',' + timeStamp.getFullYear()) + ',' + timeStamp)
    pushToClients('[ ' + info.count + ' ]' + '[ ' + Math.round(runningAverage()) + ' ]' + formatTimestamp(timeStamp))
  }
})

process.on('SIGINT', _ => {
  button.unexport()
})

server.listen(3000)
