const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const fs = require('fs')

const Gpio = require('onoff').Gpio
const button = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 })

const infoFile = 'info.json'
const databaseFile = 'database.csv'

const perUnitTime = 60000
const bracket = []

let boxCount = 0
const boxMaxItemCount = 1000
const serverGreeting = 'connected to server...'

let resetFlag = false

let infoDefault = {
  isRecording: false,
  fillingLine: '',
  product: '',
  startTimestamp: '',
  endTimestamp: '',
  count: '',
  totalTime: '',
  average: '',
  runningAverage: '',
  bracketSizeRunningAverage: 5
}

let info = {
  isRecording: infoDefault.isRecording,
  fillingLine: infoDefault.fillingLine,
  product: infoDefault.product,
  startTimestamp: infoDefault.startTimestamp,
  endTimestamp: infoDefault.endTimestamp,
  count: infoDefault.count,
  totalTime: infoDefault.totalTime,
  average: infoDefault.average,
  runningAverage: infoDefault.runningAverage,
  bracketSizeRunningAverage: infoDefault.bracketSizeRunningAverage
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
    info = JSON.parse(fs.readFileSync(infoFile))
  }
})

fs.access(databaseFile, (err) => {
  if (err) {
    fs.appendFile(databaseFile, '', function (err) {
      if (err) throw err
    })
  }
})

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
  return Math.round(info.bracketSizeRunningAverage * perUnitTime / deltaTimestamp(bracket[0], bracket[info.bracketSizeRunningAverage]))
}

function average () {
  return Math.round(info.count * perUnitTime / deltaTimestamp(info.startTimestamp, new Date()))
}

function updateInfo () {
  if (resetFlag) return
  if (info.isRecording && info.startTimestamp !== '') {
    info.totalTime = deltaTimestamp(info.startTimestamp, new Date())
    info.average = average()
  }
  io.emit('updateInfo', info)
  fs.writeFile(infoFile, JSON.stringify(info) + '\n', function (err) {
    if (err) throw err
  })
}
setInterval(updateInfo, 100)

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
  client.on('button', function (id) {
    switch (id) {
      case 1: // start
        if (info.isRecording) return
        info.isRecording = true
        break;
      case 2: // stop
        if (!info.isRecording) return
        info.isRecording = false
        info.endTimestamp = new Date()
        info.totalTime = deltaTimestamp(info.startTimestamp, info.endTimestamp)
        info.average = Math.round((info.count * perUnitTime / deltaTimestamp(info.startTimestamp, info.endTimestamp)))
        break;
      case 3: // reset
        if (resetFlag) return
        resetFlag = true        
        info = infoDefault
        fs.unlinkSync(infoFile)
        fs.unlinkSync(databaseFile)
        resetFlag = false
        updateInfo()
        break;
      default:
        break;
    }
  })
})

button.watch((err) => {
  if (err) throw err
  if (info.isRecording) {
    const timeStamp = new Date()
    info.count++
    if (info.count === 1) {
      info.startTimestamp = new Date()
    }
    updateBracket(timeStamp)
    info.runningAverage = runningAverage()
    writeToDatabase(String(info.count + ',' + info.runningAverage + ',' + timeStamp.getHours() + ',' + timeStamp.getMinutes() + ',' + timeStamp.getSeconds() + ',' + timeStamp.getDate() + ',' + Number(timeStamp.getMonth() + 1) + ',' + timeStamp.getFullYear()) + ',' + timeStamp)
    pushToClients('[ ' + info.count + ' ]' + '[ ' + info.runningAverage + ' ]' + formatTimestamp(timeStamp))
  }
})

process.on('SIGINT', _ => {
  button.unexport()
})

server.listen(3000)
