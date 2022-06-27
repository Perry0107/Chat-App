const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utilis/message')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utilis/user')

const app = express();

//express creates server in bg but socket io require server so we need to do the refactoring
const server = http.createServer(app);
const io = socketio(server);

//set static folder
const PORT = 3000 || process.env.PORT; // if we pass PORT as env varible then 2nd line-> for ex PORT=4444 node index.js
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

let count = 0;
//socket.emit->to the join karne wale bande ko
//socket.broadcast.emit->jisne bheja uske alava sabko
//io.emit->sabko

io.on('connection', (socket) => {
    console.log('New WebSocket connection')
    // message

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            username,
            room
        })
        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage('Welcome!', 'Server'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, 'Server'))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit
    })
    socket.on('sendMessage', (messages, callback) => {
        const filter = new Filter()

        if (filter.isProfane(messages)) {
            return callback('Profanity is not allowed!')
        }
        const id = socket.id;
        const user = getUser(id);

        io.to(user.room).emit('message', generateMessage(messages, user.username))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const url = 'https://google.com/maps?q=' + coords.latitude + ',' + coords.longitude;
        // console.log('ballu')
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(url, user.username))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`, 'Server'))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}!`)
})