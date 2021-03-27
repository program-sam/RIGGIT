const { getRoom } = require('./rooms')
const { getRoomUsers } = require('./users')
const delay = ms => new Promise(res => setTimeout(res, ms));

async function makeMoves(player, callBack){
    
    // Calculate N random moves and choose one.

    const room = getRoom(player.room)
    const players = getRoomUsers(player.room)
    const hexes = room.game.hexes

    const options = []

    for (let i = 0; i < 1000; i++){
        let tempHexList = JSON.parse(JSON.stringify(hexes));
        tempHexList = tempHexList.filter(h => !h.island && !h.owner)
        if (tempHexList.length < 5){ console.log('temphexlist smaller than 5'); return } // Prevent infinite loop
        const startHex = tempHexList[Math.floor(Math.random() * tempHexList.length)]
        tempHexList.splice(tempHexList.indexOf(startHex), 1)
        
        const neighbors = [startHex]

        while (neighbors.length < 5){
            const curHex = tempHexList[Math.floor(Math.random() * tempHexList.length)]
            if (neighbors.some(n => Math.sqrt((n.x - curHex.x) ** 2 + (n.y - curHex.y) ** 2) < n.radius * 2)){
                neighbors.push(curHex)
                tempHexList.splice(tempHexList.indexOf(curHex), 1)
            }
        }

        options.push(neighbors)
    }

    const scores = options.map((optionHexes) => {

        const playerScores = []
        let winningCount = 0
        
        for (let i = 0; i < players.length; i++) {
            const player = players[i]
            let sumPlayer = 0
            // Loop through all filtered hexes and count people for this player
            for (let j = 0; j < optionHexes.length; j++) {
                if (optionHexes[j].majority == player.id) { sumPlayer += optionHexes[j].people }
            }
            
            playerScores.push({id: player.id, s:sumPlayer})
            // If this player has more people than the previous record, make this the current winner
            if (sumPlayer > winningCount) {
                winningCount = sumPlayer
            }
        }

        const winningPlayers = playerScores.filter(ps => ps.s == winningCount)
        if (winningPlayers.length > 1){ return - winningCount }
        else if (playerScores.find(ps => ps.s == winningCount).id != player.id){ return - winningCount }
        else {return winningCount}
    })    
    const bestOption = options[scores.indexOf(Math.max(...scores))]
    for (let i = 0; i < 5; i++){
        await delay(1000)
        callBack(player, [bestOption[i].x, bestOption[i].y])        
    }
    
    
    
}
module.exports = { makeMoves }