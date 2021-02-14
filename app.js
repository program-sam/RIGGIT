
const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
var favicon = require('serve-favicon');


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const { formatMessage } = require('./utils/messages')
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users')
const { makeRoom, checkRoom, getRoom, removeRoom } = require('./utils/rooms')
const { generatePattern, initializeGame, handleGameClick, checkWinner } = require('./utils/game')

const botName = {username: 'GAME', id:''}
// Set static folder
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/img/blueFavicon.png'));

app.get('/', (req, res) => { res.sendFile(__dirname + '/public/html/index.html') })

app.get('/game', (req, res) => { res.sendFile(__dirname + '/public/html/game.html') })

app.get('/api/makeRoom', (req, res) => {
    res.send(makeRoom().id)
})

app.get('/api/validateRoom/:roomid', (req, res) => {
    const roomID = req.params.roomid.toLowerCase()
    res.send(checkRoom(roomID))
})

io.on('connection', socket => {
    socket.on('joinRoom', ({username, roomid}) => {
        
        roomid = roomid.toLowerCase()
        username = username.length > 15 ? username.substring(0,15) : username
        const user = userJoin(socket.id, username, roomid)
        
        socket.join(user.room)

        // Welcome current user
        socket.emit('message', formatMessage(botName ,'Welcome!'))

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName ,`${username} has joined the game`))

        // Send users and room info
        const room = getRoom(roomid)
        io.to(user.room).emit('roominfo', { room, users: getRoomUsers(user.room) })

        // If user joins while in-game, emit some required data to follow
        // Else, send new user a preview of the current map
        if (room.ingame){
            socket.emit('gameStarted', room.game)
        } else {
            socket.emit('gamePreview', generatePattern([1200, 700], [1200*0.02, 700*0.05], room.settings))
        }
        
    })

    // Listen for chatMessages
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id)
        io.to(user.room).emit('message', formatMessage(user, msg))
    })

    // Listen for player color changes
    socket.on('changeColor', color => {
        const user = getCurrentUser(socket.id)
        user.color = color
        const room = getRoom(user.room)
        io.to(user.room).emit('roominfo', { room, users: getRoomUsers(user.room) })
    })

    // Runs when clients disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        if (user){
            io.to(user.room).emit('message', formatMessage(botName ,`${user.username} has left the game`))

            const room = getRoom(user.room)
            const users = getRoomUsers(room.id)
            if (users.length == 0){ removeRoom(user.room); return }

            // If a person leaves, check if room should be removed or game should be ended
            if (room.ingame){

                // The proper logic is a pain, just quit the current game for now
                room.game.gameSettings.moveOrder = []
                room.ingame = false


                // const mo = room.game.gameSettings.moveOrder
                // // Check if there are still active players and continue the round or quit the game
                // if (!users.some(u => mo.map(m => m.id).includes(u.id))) {
                //     room.game.gameSettings.moveOrder = []
                //     room.ingame = false
                // }
                // else {
                //     const userIndex = mo.map(m => m.id).indexOf(user.id)
                //     if (room.game.gameSettings.currentPlayer.id == user.id){
                //         const newPlayerIndex = userIndex + 1 >= mo.length ? 0 : userIndex + 1
                //         room.game.gameSettings.currentPlayer = mo[newPlayerIndex]
                //         console.log(mo)
                //         console.log(mo[newPlayerIndex])
                //     }
                // }
            }

            io.to(user.room).emit('roominfo', { room, users })
        }
        
    })

    // Initializes a new game
    socket.on('startGame',  () => {
        const user = getCurrentUser(socket.id)
        const room = getRoom(user.room)
        if (room.ingame){ return }

        room.ingame = true
        initializeGame(room)
        io.to(user.room).emit('gameStarted', room.game)
    })

    // Do all the game logic when the mouse is clicked
    socket.on('mouseClick', (coordinates) => {
        const user = getCurrentUser(socket.id)
        const room = getRoom(user.room)
        if (room.ingame && room.game.gameSettings.currentPlayer.id == user.id){
            const clickedSmth = handleGameClick(room, coordinates)
            if (!clickedSmth){ return }
            io.to(user.room).emit('gameData', room.game)
            if (room.game.gameOver){
                room.game.gameOver = false
                room.ingame = false
                const winners = checkWinner(room)
                const players = getRoomUsers(user.room)
                for (let i = 0; i < players.length; i++){
                    const p = players[i]
                    if (winners.some(w => w.id == p.id) && winners.length > 1){ p.ties += 1 }
                    else if (winners.some(w => w.id == p.id)){ p.wins += 1 }
                }
                io.to(user.room).emit('gameOver', winners)
                io.to(user.room).emit('roominfo', { room, users: players })
            }
        } 
    })

    socket.on('updateSettings', settings => {
        if (settings.cellSize < 10 || settings.cellSize > 100) { return }
        const user = getCurrentUser(socket.id)
        const room = getRoom(user.room)
        room.settings.radius = parseInt(settings.cellSize) || 40
        room.settings.gridShape = settings.gridShape
        io.to(user.room).emit('roominfo', { room, users: getRoomUsers(user.room) })
        io.to(user.room).emit('gamePreview', generatePattern([1200, 700], [1200*0.02, 700*0.05], room.settings))
    })
})

const PORT = 3000 || process.env.PORT

server.listen(PORT, () => console.log('Server running'))