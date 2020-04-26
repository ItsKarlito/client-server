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
  document.getElementById('dot').style.background = data.isRecording ? 'green' : 'red'
  data.fillingLine !== '' && !data.isReset ? document.getElementById('line').value = data.fillingLine : document.getElementById('line').placeholder = 'filling line'
  data.product !== '' && !data.isReset ? document.getElementById('product').value = data.product : document.getElementById('product').placeholder = 'product name'
  data.startTimestamp !== '' && !data.isReset ? document.getElementById('start').value = formatTimestamp(data.startTimestamp) : document.getElementById('start').placeholder = 'start time'
  data.endTimestamp !== '' && !data.isReset ? document.getElementById('end').value = formatTimestamp(data.endTimestamp) : document.getElementById('end').placeholder = 'end time'
  data.count !== '' && !data.isReset ? document.getElementById('count').value = data.count : document.getElementById('count').placeholder = '0'
  data.totalTime !== '' && !data.isReset ? document.getElementById('totalTime').value = formatTotalTime(data.totalTime) : document.getElementById('totalTime').placeholder = '00:00:00'
  data.average !== '' && !data.isReset ? document.getElementById('average').value = data.average : document.getElementById('average').placeholder = '0'
  data.runningAverage !== '' && !data.isReset ? document.getElementById('runningAverage').value = data.runningAverage : document.getElementById('runningAverage').placeholder = '0'
  document.getElementById('bracketSizeRunningAverage').value = data.bracketSizeRunningAverage
})
