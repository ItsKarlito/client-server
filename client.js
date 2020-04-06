const socket = io.connect('http://192.168.2.207:3000');
box =  document.getElementById('box');

const clientGreeting = 'connected to client...';

// The socket.on('connect') is an event which is fired upon a successful connection from the web browser
// We then have a function callback that will send to the server the hello world message.
socket.on('connect', function (data) {
    socket.emit('join', clientGreeting);
});

function getDate(){
    const date = new Date();
    const formatedDate = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
    return formatedDate;
}

function getTime(){
    const time = new Date();
    const formatedTime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
    return formatedTime;
}

socket.on('broad', function (data) {
    let p = document.createElement('p');
    p.textContent = data + ' [ ' + getTime() + ' - ' + getDate() + ' ]';
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
});

socket.on('clearBox', function (data) {
    box.innerHTML = "";
    console.log('box cleared');
});

socket.on('messages', function(data) {
    console.log(data);
});

$('form').submit(function (e) {
    e.preventDefault();
    let message = $('#chat_input').val();
    socket.emit('messages', message);
});