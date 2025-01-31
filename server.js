const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, {
	debug: true,
})
const { v4: uuidv4 } = require('uuid')
const activeRooms = new Set();

app.use('/peerjs', peerServer)
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
	res.redirect(`/${uuidv4()}`)
})
app.get("/active_room", (req, res) => {
    res.json(Array.from(activeRooms)); // Chuyển Set sang Array trước khi trả về
});
app.get('/:room', (req, res) => {
	res.render('room', { roomId: req.params.room })
})

io.on('connection', (socket) => {
	socket.on('join-room', (roomId, userId) => {
		activeRooms.add(roomId);
		socket.join(roomId)
		socket.to(roomId).broadcast.emit('user-connected', userId)

		socket.on('message', (message) => {
			io.to(roomId).emit('createMessage', message, userId)
		})
		socket.on('disconnect', () => {
			socket.to(roomId).broadcast.emit('user-disconnected', userId)
			if (io.sockets.adapter.rooms.get(roomId)?.size === 0) {
                activeRooms.delete(roomId);
            }
		})
	})
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
