const socket = io.connect('http://192.168.2.219:3000')

const box = document.getElementById('box')

function start () {
  socket.emit('start')
}

function stop () {
  socket.emit('stop')
}

function formatTimestamp (timeStamp) {
  if (timeStamp === '') return timeStamp
  const dateTime = new Date(timeStamp)
  const formatedDate = `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
  const formatedTime = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
  return String(formatedTime + ' - ' + formatedDate)
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

socket.on('updateDatabaseHeader', function (data) {
  document.getElementById('line').value = data.fillingLine
  document.getElementById('product').value = data.product
  document.getElementById('start').value = formatTimestamp(data.startTimestamp)
  document.getElementById('end').value = formatTimestamp(data.endTimestamp)
  document.getElementById('count').value = data.count
  document.getElementById('totalTime').value = data.timeElapsed
  document.getElementById('average').value = data.averageUnitPerUnitTime
  document.getElementById('bracketSizeRunningAverage').value = data.bracketSizeRunningAverage
})
