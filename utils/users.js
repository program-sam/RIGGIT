const { getRoom } = require('./rooms')

const users = []
const botNames = [
    'Linguo', 'T-800', 'T-1000', 'Maria', 'Sonny', 'Number Six', 'Gerty', 'Kryten', 'WALL-E', 'Gort', 'Rosie', 'AWESOM-O', 'Optimus',
    'Robot B-9', 'HAL', 'Terminator', 'Johnny 5', 'Marvin', 'Bishop', 'Bender', 'R2-D2', 'C-3PO', 'Shinatama', 'ClapTrap', 'Mr. Handy',
    'Harkness', 'Turtlebot', 'Mettaton', 'Codsworth', 'Talos', 'Golem', 'K-9', 'Chip', 'D.A.R.Y.L.', 'Droid', 'EVE', 'TARS', 'CHAPPIE',
    'Ultron', 'Voltron', 'Baymax', 'Roboto', 'Psycho Ranger', 'Argus', 'Brainbot', 'Doris', 'Krieger', 'Scaramouche'
]
// Join user to chat
function userJoin(id, username, room){
    const user = {
        id,
        username,
        room,
        color: randomColor(room),
        wins: 0,
        ties: 0,
        bot: false,
    }
    users.push(user);
    return user
}

function botJoin(room){
    const id = Math.random().toString(36).substring(7)
    const bot = {
        id: id,
        username: botNames[Math.floor(Math.random() * botNames.length)] + ' (AI)',
        room,
        color: randomColor(room),
        wins: 0,
        ties: 0,
        bot: true
    }
    users.push(bot)
    return bot
}

function getCurrentUser(id){
    return (users.find(user => user.id === id))
}

function userLeave(id){
    const index = users.findIndex(user => user.id === id)
    if (index !== -1){
        return users.splice(index, 1)[0]
    }
}

function getRoomUsers(room){
    return users.filter(user => user.room === room)
}

function randomColor(roomid){
    const room = getRoom(roomid)
    const usedColors = getRoomUsers(roomid).map(p => p.color)
    colorList = room.availableColors.filter(c => !usedColors.includes(c))
    return colorList.length > 0
        ? colorList[Math.floor(Math.random() * colorList.length)]
        : '#000'

}
module.exports = {
    userJoin,
    botJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
}