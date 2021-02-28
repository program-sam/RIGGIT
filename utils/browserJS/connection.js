const socket = io()

let colorList = ['#c04abc', '#d81159', '#a41623', '#c27100', '#FFD23F', '#3da5d9', '#0d5c63', '#29bf12', '#0B032D']
const win = new Audio('aud/win.mp3');
const yourTurn = new Audio('aud/yourTurn.mp3');
const messagePing = new Audio('aud/message.mp3');

let itIsYourTurn = false

// Get username and room from URL
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
if (!username || !room) { window.location.href = '/' }
window.history.replaceState({}, document.title, "/game");

let ingame = false
let players = []
let you = {}

fetch(`/api/validateRoom/${room}`)
    .then(res => res.text())
    .then(res => {
        if (res == 'true') {
            socket.emit('joinRoom', { username, roomid: room })
            document.getElementById('title').innerHTML = room.toUpperCase()

            // When a game was joined, add an event listener to warn the user when he leaves
            window.addEventListener("beforeunload", function (e) {
                if (!ingame) { return undefined }
                var confirmationMessage = 'You are about to leave the current game. '
                    + 'If you leave the current game will end and your score will be lost.';

                (e || window.event).returnValue = confirmationMessage; //Gecko + IE
                return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
            });

        } else {
            window.location.href = '/'
        }
    })


socket.on('message', message => {
    document.getElementById('chatMessages').innerHTML += `<div class='chatMessage ${message.id == you.id ? 'you' : ''}'><strong>${message.username}:</strong> ${message.text}</div>`
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight
    if (message.id !== you.id){ messagePing.play() }
})

socket.on('roominfo', data => {
    players = data.users
    you = players.find(p => p.id == socket.id)

    const usedColors = players.map(p => p.color.toLowerCase())
    colorList = data.room.availableColors.filter(c => !usedColors.includes(c.toLowerCase()))

    document.getElementById('gridShape').innerHTML = '<optgroup label="Shapes"><option value="Rectangle">Rectangle</option></optgroup><optgroup label="Countries">'

    data.room.availableCountries.map(c => {
        document.getElementById('gridShape').innerHTML += `<option ${c == data.room.settings.gridShape ? 'selected' : ''} value='${c}'>${c}</option>`
    })

    document.getElementById('gridShape').innerHTML += '</optgroup>'

    const table = document.getElementById('playerList')
    const playerBox = document.getElementById('playerBox')
    table.innerHTML = ''

    for (let i = 0; i < players.length; i++) {
        const player = players[i]

        // Edit table in lobby
        table.innerHTML += `<tr>
            <td>${player.username}</td>
            <td><div class="picker ${player.id}" style='background-color: ${player.color}'></div></td>
            <td>${player.wins}</td>
            <td>${player.ties}</td>    
        </tr>`
    }

    $(`.${you.id}`).colorPick({
        'allowRecent': false,
        'initialColor': you.color,
        'palette': colorList,
        'onColorSelected': function () {
            this.element.css({ 'backgroundColor': this.color, 'color': this.color });
            if (this.color.toUpperCase() != you.color.toUpperCase()) {
                socket.emit('changeColor', this.color);
            }
        }
    });

    ingame = data.room.ingame
    if (ingame) {
        document.getElementById('lobby').style.top = '-300%'
        gameSettings = data.room.game.gameSettings
    }
    else { document.getElementById('lobby').style.top = 'initial' }

    document.getElementById('cellSize').value = data.room.settings.radius
    document.getElementById('cellSizeText').value = data.room.settings.radius
    drawPlayerBox(data.room.game.gameSettings || gameSettings, players, data.room.game.hexes)
})

socket.on('gameStarted', message => {
    hexes = message.hexes.map(h => new Hex(h))
    gameSettings = message.gameSettings
    ingame = true

    initializeGame()
    drawPlayerBox(gameSettings, players, message.hexes)
    document.getElementById('lobby').style.top = '-300%'
    if (!itIsYourTurn && gameSettings.currentPlayer.id == you.id){ itIsYourTurn = true; yourTurn.play() }
})

socket.on('gameData', message => {
    // Do not simply create a new list because neighbors are only calculated on init
    hexes.map((h, i) => {
        h.majority = message.hexes[i].majority;
        h.ownerTimer = h.owner == message.hexes[i].owner ? h.ownerTimer : 0
        h.owner = message.hexes[i].owner;
        h.elected = message.hexes[i].elected;
        h.turn = message.hexes[i].turn;
        h.island = message.hexes[i].island;
    })

    gameSettings = message.gameSettings
    drawPlayerBox(gameSettings, players, message.hexes)

    if (!itIsYourTurn && gameSettings.currentPlayer.id == you.id){ itIsYourTurn = true; yourTurn.play() }
    else if (itIsYourTurn && gameSettings.currentPlayer.id != you.id){ itIsYourTurn = false }

})

socket.on('gameOver', players => {
    // Handle winners events
    itIsYourTurn = false
    document.getElementById('popup').innerHTML = ''
    const pNames = players.map(p => p.username)

    if (pNames.length == 1) {
        document.getElementById('popup').innerHTML = pNames[0] + ' won this game!'
    } else if (pNames.length > 1) {
        const lastPlayer = pNames.splice(-1, 1)[0]
        document.getElementById('popup').innerHTML = pNames.join(', ').slice(0, -2) + ' and ' + lastPlayer + ' are worthy opponents!'
    } else { return }

    document.getElementById('popup').classList.add("show")
    document.getElementById('fade').classList.toggle('show')
    document.getElementById('buymeacoffee').style.visibility = 'visible'
    setTimeout(() => {
        document.getElementById('popup').classList.remove("show")
        document.getElementById('fade').classList.remove('show')
    }, 3000)

    // Launch the confetti cannons!
    setTimeout(() => {
        win.play()
        const cannon = document.createElement('canvas')
        cannon.width = window.innerWidth * 0.9
        cannon.height = window.innerHeight * 0.9
        cannon.style.position = 'absolute'
        cannon.style.top = '0'
        cannon.style.bottom = '0'
        document.body.appendChild(cannon)
    
        const myConfetti1 = confetti.create(cannon, { resize: true, useWorker: true })
        myConfetti1({
            particleCount: 150,
            startVelocity: 50,
            decay: 0.95,
            scalar: 1.2,
            spread: 45,
            angle: 35,
            origin: {x: 0, y: 1}
        });

        const myConfetti2 = confetti.create(cannon, { resize: true, useWorker: true })
        myConfetti2({
            particleCount: 150,
            startVelocity: 50,
            decay: 0.95,
            scalar: 1.2,
            spread: 45,
            angle: 145,
            origin: {x: 1, y: 1}
        });
    
        setTimeout(() => { myConfetti1.reset(); myConfetti2.reset(); cannon.remove() }, 2500)

    }, 500)
    

})

socket.on('gamePreview', previewHexes => { hexes = previewHexes.map(h => new Hex(h)) })

socket.on('roomError', _ => {
    alert('So sorry but something went wrong with this game room. You will be redirected to home page where you can start a new game.')
    window.location.href = '/'
})

function sendMessage() {
    const content = document.getElementById('chatInput')
    if (content.value) {
        socket.emit('chatMessage', content.value)
        content.value = ''
    }
}

function startGame() {
    socket.emit('startGame')
}

function updateSettings() {
    const cellSize = document.getElementById('cellSize')
    const gridShape = document.getElementById('gridShape')
    if (cellSize.value) {
        socket.emit('updateSettings', {
            cellSize: cellSize.value,
            gridShape: gridShape.value
        })
    }
}

function drawPlayerBox(gs, players, hexes) {
    document.getElementById('playerBox').innerHTML = ''
    for (let i = 0; i < gs.moveOrder.length; i++) {
        const player = gs.moveOrder[i]
        const scoreCount = hexes.reduce((acc, cur) => cur.elected == player.id ? acc + parseInt(cur.people) : acc, 0)
        playerBox.innerHTML += `
            <div class='player ${player.id == gs.currentPlayer.id ? 'current' : ''}'> <span style='background-color: ${player.color}'></span>
            <p class='playerName'>${player.username}</p><p class='playerScore'>${scoreCount}</p></div> `
    }

    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        if (gs.moveOrder.map(m => m.id).includes(player.id)) { continue }
        playerBox.innerHTML += `
            <div class='player ${ingame ? 'watching' : ''}'> <span style='background-color: ${player.color}'></span>
            <p>${player.username}</p> </div> `
    }
}