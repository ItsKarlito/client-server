const socket = io.connect('http://192.168.2.219:3000')
const box = document.getElementById('box')

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
