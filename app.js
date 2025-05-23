
const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
var favicon = require('serve-favicon');


const app = express()
const server = http.createServer(app)
const io = socketio(server)
const zip = require('express-easy-zip');


const { formatMessage } = require('./utils/messages')
const { userJoin, botJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users')
const { makeRoom, checkRoom, getRoom, removeRoom } = require('./utils/rooms')
const { generatePattern, initializeGame, handleGameClick, checkWinner } = require('./utils/game')
const { makeMoves } = require('./utils/ai')



const botName = {username: 'RIGGIT', id:''}
// Set static folder
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/img/blueFavicon.png'));
app.use(zip());

app.get('/', (req, res) => { res.sendFile(__dirname + '/public/html/index.html') })

app.get('/game', (req, res) => { res.sendFile(__dirname + '/public/html/game.html') })

app.get('/api/makeRoom', (req, res) => {
    res.send(makeRoom().id)
})

app.get('/api/exportallgamearchives753', (req, res) => {
    res.zip({
        files: [{
            path: __dirname + "/archive",
            name: 'archive'
        }],
        filename: 'archive.zip'
    });
})

app.get('/api/validateRoom/:roomid', (req, res) => {
    const roomID = req.params.roomid.toLowerCase()
    res.send(checkRoom(roomID))
})

io.on('connection', socket => {
    socket.on('joinRoom', ({username, roomid}) => {
        
        roomid = roomid.toLowerCase()
        username = username.length > 15 ? username.substring(0,15) : username
        const user = userJoin(socket.id, username.replace(/</g, "&lt;").replace(/>/g, "&gt;"), roomid)
        if (!user){ socket.emit('roomError'); return }
        socket.join(user.room)

        // Welcome current user
        socket.emit('message', formatMessage(botName ,'Welcome!'))

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName ,`${username} has joined the game`))

        // Send users and room info
        const room = getRoom(roomid)
        if (getRoomUsers(roomid).length == 1){ room.host = user.id }
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
        const msgSafe = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        if (!user){ socket.emit('roomError'); return }
        io.to(user.room).emit('message', formatMessage(user, msgSafe))
    })

    // Listen for player color changes
    socket.on('changeColor', data => {
        const user = getCurrentUser(data.id)
        if (!user){ socket.emit('roomError'); return }
        if (data.id != socket.id && !user.bot){ return }

        user.color = data.color
        const room = getRoom(user.room)
        io.to(user.room).emit('roominfo', { room, users: getRoomUsers(user.room) })
    })

    // Runs when clients disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        if (user){
            if (!user){ socket.emit('roomError'); return }
            io.to(user.room).emit('message', formatMessage(botName ,`${user.username} has left the game`))

            const room = getRoom(user.room)
            const users = getRoomUsers(room.id).filter(p => !p.bot)
            if (users.length == 0){
                getRoomUsers(room.id).forEach(bot => userLeave(bot.id))
                removeRoom(user.room);
                return }
            if (room.host == user.id){ room.host = users[0].id }

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
        } else {
            socket.emit('roomError');
        }
        
    })

    // Initializes a new game
    socket.on('startGame',  () => {
        const user = getCurrentUser(socket.id)
        if (!user){ socket.emit('roomError'); return }
        const room = getRoom(user.room)
        if (room.ingame){ return }

        room.ingame = true
        initializeGame(room)
        io.to(user.room).emit('gameStarted', room.game)
    })

    // Do all the game logic when the mouse is clicked
    socket.on('mouseClick', (coordinates) => {
        const user = getCurrentUser(socket.id)
        if (!user){ socket.emit('roomError'); return }
        clickLogic(user, coordinates)
    })

    socket.on('updateSettings', settings => {
        if (settings.cellSize < 10 || settings.cellSize > 100) { return }
        const user = getCurrentUser(socket.id)
        if (!user){ socket.emit('roomError'); return }
        const room = getRoom(user.room)
        room.settings.radius = parseInt(settings.cellSize) || 40
        room.settings.gridShape = settings.gridShape
        io.to(user.room).emit('roominfo', { room, users: getRoomUsers(user.room) })
        io.to(user.room).emit('gamePreview', generatePattern([1200, 700], [1200*0.02, 700*0.05], room.settings))
    })

    socket.on('kickPlayer', data => {
        if (socket.id != getRoom(getCurrentUser(socket.id).room).host){ return }

        const user = userLeave(data.id)
        if (user){
            io.to(user.room).emit('message', formatMessage(botName ,`${data.name} has been kicked by the host`))
            io.to(user.room).emit('roominfo', { room: getRoom(user.room), users: getRoomUsers(user.room) })
        } else {
            socket.emit('roomError');
        }
    })

    socket.on('addNPC', _ => {
        const user = getCurrentUser(socket.id)
        const bot = botJoin(user.room)

        io.to(user.room).emit('message', formatMessage(botName ,`${bot.username} has joined the game`))
        io.to(user.room).emit('roominfo', { room: getRoom(user.room), users: getRoomUsers(user.room) })
    })
})

function clickLogic(user, coordinates){
    const room = getRoom(user.room)
    if (!room){ return }
    if (room.ingame && room.game.gameSettings.currentPlayer.id == user.id){
        const clickedSmth = handleGameClick(room, coordinates)
        if (!clickedSmth){
            const nextPlayer = room.game.gameSettings.currentPlayer
            if (nextPlayer.bot){ makeMoves(room.game.gameSettings.currentPlayer, clickLogic) }
            return
        }
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
        const nextPlayer = room.game.gameSettings.currentPlayer
        if (user != nextPlayer && nextPlayer.bot){ makeMoves(room.game.gameSettings.currentPlayer, clickLogic) }
    }
}

const PORT = 3000 || process.env.PORT

server.listen(PORT, () => console.log('Server running'))