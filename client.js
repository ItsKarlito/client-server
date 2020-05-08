const socket = io.connect('http://192.168.2.219:3000')

const box = document.getElementById('box')

function start () {
  socket.emit('button', 1)
}

function stop () {
  socket.emit('button', 2)
}

function reset () {
  socket.emit('button', 3)
}

function formatTimestamp (timeStamp) {
  const dateTime = new Date(timeStamp)
  const formatedDate = `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
  const formatedTime = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
  return String(formatedTime + ' - ' + formatedDate)
}

function formatTotalTime (ms) {
  var delta = Math.abs(ms) / 1000
  var days = Math.floor(delta / 86400)
  delta -= days * 86400
  var hours = Math.floor(delta / 3600) % 24
  delta -= hours * 3600
  if (hours < 10) hours = '0' + hours
  var minutes = Math.floor(delta / 60) % 60
  delta -= minutes * 60
  if (minutes < 10) minutes = '0' + minutes
  var seconds = Math.floor(delta) % 60
  if (seconds < 10) seconds = '0' + seconds
  return hours + ':' + minutes + ':' + seconds
}

socket.on('connect', function () {
  socket.emit('join')
})

socket.on('broad', function (data) {
  const p = document.createElement('p')
  p.textContent = data
  box.appendChild(p)
  box.scrollTop = box.scrollHeight
})

socket.on('clearBox', function () {
  box.innerHTML = ''
})

socket.on('updateInfo', function (data) {
  if (!data.isReset) {
    if (data.isRecording !== '') document.getElementById('dot').style.background = data.isRecording ? 'green' : 'red'
    if (data.fillingLine !== '') document.getElementById('line').value = data.fillingLine
    if (data.product !== '') document.getElementById('product').value = data.product
    if (data.startTimestamp !== '') document.getElementById('start').value = formatTimestamp(data.startTimestamp)
    if (data.endTimestamp !== '') document.getElementById('end').value = formatTimestamp(data.endTimestamp)
    if (data.count !== '') document.getElementById('count').value = data.count
    if (data.totalTime !== '') document.getElementById('totalTime').value = formatTotalTime(data.totalTime)
    if (data.average !== '') document.getElementById('average').value = data.average
    if (data.runningAverage !== '') document.getElementById('runningAverage').value = data.runningAverage
    if (data.bracketSizeRunningAverage !== '') document.getElementById('bracketSizeRunningAverage').value = data.bracketSizeRunningAverage
  } else {
    document.getElementById('dot').style.background = data.isRecording ? 'green' : 'red'
    document.getElementById('product').value = ''
    document.getElementById('line').value = ''
    document.getElementById('start').value = ''
    document.getElementById('end').value = ''
    document.getElementById('count').value = ''
    document.getElementById('totalTime').value = ''
    document.getElementById('average').value = ''
    document.getElementById('runningAverage').value = ''
    document.getElementById('bracketSizeRunningAverage').value = ''
    document.getElementById('bracketSizeRunningAverage').value = ''
    box.innerHTML = ''
  }
})
