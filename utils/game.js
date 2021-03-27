const { getRoomUsers } = require('./users')
const inside = require('point-in-polygon');
const fs = require('fs');
const rawdata = fs.readFileSync('./utils/data/countries.geojson');
const countryNames = []
let countryData = JSON.parse(rawdata);

countryData = countryData.features.map(cd => {
    
    countryNames.push(cd.properties.CNTRY_NAME)
    const shape = cd.geometry.coordinates.map(c => c[0])
    const destination = [1200*0.98, 700*0.95]

    let minX = minY = Number.MAX_SAFE_INTEGER
    let maxX = maxY = -Number.MAX_SAFE_INTEGER
    for (let p = 0; p < shape.length; p++){
        const part = shape[p]
        for (let i = 0; i < part.length; i++){
            minX = minX < part[i][0] ? minX : part[i][0]
            minY = minY < part[i][1] ? minY : part[i][1]
            maxX = maxX > part[i][0] ? maxX : part[i][0]
            maxY = maxY > part[i][1] ? maxY : part[i][1]
        }
    }
    

    // Scale the country to the screen resolution
    // Margins are used to center the country in the screen
    let scale = 1
    let marginX = 0
    let marginY = 0

    const resolution = (maxX - minX) / (maxY - minY)
    const targetRes = (destination[0] / destination[1])

    if ( resolution > targetRes){
        // In this case, the country is wider than the ratio of the screen
        scale = (maxX - minX) / destination[0]
        marginY = (1 - (targetRes / resolution)) * destination[1] / 2
    } else {
        // In this case, the country is taller than the ratio of the screen
        scale = (maxY - minY) / destination[1]
        marginX = (1 - (resolution / targetRes)) * destination[0] / 2
    }

    return shape.map(p => p.map(c => [marginX + (c[0] - minX) / scale, marginY + (c[1] - minY)/scale]))
})

class Hex {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.majority = undefined;
        this.owner = undefined;
        this.elected = undefined;
        this.neighbors = [];
        this.people = 0;
        this.turn = 0;
        this.island = false;
    }
}

function generatePattern(mapDimensions, mapMargins, settings){
    const { radius, gridShape } = settings
    const [mapWidth,  mapHeight] = mapDimensions
    const [mapMarginX,  mapMarginY] = mapMargins

    const hexes = []
    let even = true
    const c30d = Math.cos(Math.PI / 6)
    const r = radius
    const maxX = mapWidth - mapMarginX - r
    const maxY = mapHeight - mapMarginY - r

    const idx = countryNames.indexOf(gridShape)
    const shape = idx >= 0 ? countryData[idx] : undefined

    // Generating Hex pattern
    for (let x = mapMarginX + r; x < maxX; x += r * 1.5) {
        even = !even
        for (let y = mapMarginY + r * (even ? 2 * c30d : c30d); y < maxY; y += r * 2 * c30d) {
            if (shape){
                if (shape.some(s => inside([x, mapMarginY + (maxY - y)], s))){ hexes.push(new Hex(x, y, r)) }
            } else { hexes.push(new Hex(x, y, r)) }
        }
    }
    return hexes
}

function initializeGame(room){
    const mapWidth = 1200
    const mapHeight = 700
    const mapMarginX = mapWidth * 0.02
    const mapMarginY = mapHeight * 0.05
    const players = getRoomUsers(room.id)
    const moveOrder = shuffle(JSON.parse(JSON.stringify(players)))
    moveOrder.sort((x,y) => x == moveOrder.find(m => !m.bot) ? -1 : y == moveOrder.find(m => !m.bot) ? 1 : 0 )
    // Generate hexes pattern
    const hexes = generatePattern([mapWidth, mapHeight], [mapMarginX, mapMarginY], room.settings)
    // Randomly distribute people
    randomlyDistributePeople(hexes, moveOrder)
    // Calculate Hex Neighbors
    for (let i = 0; i < hexes.length; i++) {
        const H = hexes[i]
        for (let j = 0; j < hexes.length; j++) {
            const h = hexes[j]
            if (H == h) { continue }
            if (Math.sqrt((H.x - h.x) ** 2 + (H.y - h.y) ** 2) < H.radius.radius * 2) {
                H.neighbors.push(h)
            }
        }
    }
    checkUnusable(room, hexes)
    
    room.game = {
        gameSettings: {
            mapWidth,
            mapHeight,
            mapMarginX,
            mapMarginY,
            moveOrder,
            currentPlayer: moveOrder[0],
            turnCount: 1,
            move: 1
        },
        hexes,
        gameOver: false,
    }

    // Create a file to store this game's moves
    room.gameStarted = new Date()
    fs.writeFile('archive/' + room.id + ' ' + room.gameStarted.getTime()+ '.txt', JSON.stringify(room), err => { if(err){console.log(err)} })

}

function randomlyDistributePeople(hexes, players){
    let hexCount = 0

    // 1 block everywhere
    while (hexCount < hexes.length) {
        for (let i = 0; i < players.length; i++) {
            if (hexCount == hexes.length) { continue }
            let found = false
            while (!found) {
                const h = hexes[parseInt(Math.random() * hexes.length)];
                if (!h.majority) {
                    h.majority = players[i].id
                    h.people = 1
                    found = true
                    hexCount += 1
                }
            }
        }
    }
    // 4 blocks
    for (let i = 0; i < parseInt(hexes.length / players.length * 0.1); i++){
        for (let j = 0; j < players.length; j++) {
            if (players.length - j  > i){ continue } // Give first player slightly less of an advantage
            let found = false
            while (!found) {
                const h = hexes[parseInt(Math.random() * hexes.length)];
                if (h.majority == players[j].id && h.people == 1) {
                    h.people = 4
                    found = true
                }
            }
        }
    }
    // 3 blocks
    for (let i = 0; i < parseInt(hexes.length / players.length * 0.2); i++){
        for (let j = 0; j < players.length; j++) {
            let found = false
            while (!found) {
                const h = hexes[parseInt(Math.random() * hexes.length)];
                if (h.majority == players[j].id && h.people == 1) {
                    h.people = 3
                    found = true
                }
            }
        }
    }
    // 2 blocks
    for (let i = 0; i < parseInt(hexes.length / players.length * 0.4); i++){
        for (let j = 0; j < players.length; j++) {
            let found = false
            while (!found) {
                const h = hexes[parseInt(Math.random() * hexes.length)];
                if (h.majority == players[j].id && h.people == 1) {
                    h.people = 2
                    found = true
                }
            }
        }
    }
}

function handleGameClick(room, coordinates){
    const currentPlayer = room.game.gameSettings.currentPlayer
    const turnCount = room.game.gameSettings.turnCount
    const moveOrder = room.game.gameSettings.moveOrder
    const [mouseX, mouseY] = coordinates
    
    let clickedSmth = false

    room.game.hexes.forEach(h => {
        if (h.island){ return }
        if (h.owner) { return }
        const selected = Math.sqrt((h.x - mouseX) ** 2 + (h.y - mouseY) ** 2) < h.radius * Math.cos(Math.PI / 6)
        if (selected) {
            clickedSmth = true
            const neighbors = room.game.hexes.filter(hn => Math.sqrt((hn.x - h.x) ** 2 + (hn.y - h.y) ** 2) < hn.radius * 2)
            if (neighbors.some(n => n.owner == currentPlayer.id && n.turn == turnCount) || room.game.gameSettings.move == 1) {
                h.owner = currentPlayer.id
                h.turn = turnCount
                room.game.gameSettings.move += 1
            }
            if (room.game.gameSettings.move > room.settings.hexPerTurn) {
                room.game.gameSettings.move = 1
                assessNewDistrict(room, currentPlayer, turnCount)
                checkUnusable(room, room.game.hexes)
                
                let n = 0
                let nextPlayerIsValid = false
                const activePlayers = getRoomUsers(room.id)

                while (n < moveOrder.length + 1 && !nextPlayerIsValid){
                    n++

                    if (moveOrder.indexOf(room.game.gameSettings.currentPlayer) == moveOrder.length - 1) {
                        room.game.gameSettings.currentPlayer = moveOrder[0]
                        room.game.gameSettings.turnCount += 1
                    } else {
                        room.game.gameSettings.currentPlayer = moveOrder[moveOrder.indexOf(currentPlayer) + 1]
                    }
                    if (activePlayers.map(ap => ap.id).includes(room.game.gameSettings.currentPlayer.id)){
                        nextPlayerIsValid = true
                    }
                }
                
            }

            // Store this move in the archive
            fs.appendFile('archive/' + room.id + ' ' + room.gameStarted.getTime()+ '.txt', '\n' + JSON.stringify(
                {
                    x: h.x,
                    y: h.y,
                    r: h.radius,
                    m: h.majority,
                    o: h.owner,
                    e: h.elected,
                    p: h.people,
                    d: (new Date()).getTime()
                }
            ), err => { if(err){console.log(err)} })
        }
    })

    return clickedSmth
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }

function assessNewDistrict(room, pl, tc) {
    const hexes = room.game.hexes
    const players = room.game.gameSettings.moveOrder
    const currentPlayer = room.game.gameSettings.currentPlayer

    const filteredHexes = hexes.filter(h => h.owner == pl.id && h.turn == tc)
    const playerScores = []
    let winningCount = 0
    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        let sumPlayer = 0
        // Loop through all filtered hexes and count people for this player
        for (let j = 0; j < filteredHexes.length; j++) {
            if (filteredHexes[j].majority == player.id) {
                sumPlayer += filteredHexes[j].people
            }
        }
        
        playerScores.push({id: player.id, s:sumPlayer})
        // If this player has more people than the previous record, make this the current winner
        if (sumPlayer > winningCount) {
            winningCount = sumPlayer
        }
    }

    // Filter all players that have the winning count. If there is only one, good, he is the winner.
    // If there are multiple, take out the current player, and let a random other player with the winning count win.
    // This way it is discouraged to get a tie in a district
    let winningPlayers = playerScores.filter(ps => ps.s == winningCount)
    let winningPlayer = winningPlayers[0]

    if (winningPlayers.length > 1){
        winningPlayers = playerScores.filter(ps => ps.s == winningCount && ps.id != currentPlayer.id)
        winningPlayer = winningPlayers[Math.floor(Math.random() * winningPlayers.length)]
    }

    for (let i = 0; i < filteredHexes.length; i++) {
        filteredHexes[i].elected = winningPlayer.id
    }
}

function checkUnusable(room, hexes) {
    const visited = []
    let gameOver = true
    
    for (let i = 0; i < hexes.length; i++) {
        const h = hexes[i]

        if (visited.includes(h)) { continue }
        if (h.owner) { continue }

        const toVisit = [h]
        const currentIsland = []

        while(toVisit.length > 0){
            const currentVisit = toVisit[0]
            const neighbors = hexes.filter(hn => Math.sqrt((hn.x - currentVisit.x) ** 2 + (hn.y - currentVisit.y) ** 2) < hn.radius * 2)
            for (let j = 0; j < neighbors.length; j++){
                const n = neighbors[j]

                if (visited.includes(n)){ continue }
                if (toVisit.includes(n)){ continue }
                if (n.owner) { continue }

                toVisit.push(n)
            }
            visited.push(currentVisit)
            currentIsland.push(currentVisit)
            toVisit.shift()
        }

        if (currentIsland.length < 5){
            for (let j = 0; j < currentIsland.length; j++) {
                currentIsland[j].island = true
            }
        } else {
            gameOver = false
        }
    }

    if (gameOver){ room.game.gameOver = true }

}

function checkWinner(room) {
    const players = room.game.gameSettings.moveOrder
    const hexes = room.game.hexes
    const score = {}
    for (let i = 0; i < players.length; i++){ score[players[i].id] = 0 }
    for (let i = 0; i < hexes.length; i++){ if ( hexes[i].elected ){ score[hexes[i].elected] += hexes[i].people } }
    const maxScore = Math.max(...Object.values(score))
    return players.filter(p => score[p.id] == maxScore)
}

module.exports = {
    generatePattern,
    initializeGame,
    handleGameClick,
    checkWinner,
}