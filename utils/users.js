const { getRoom } = require('./rooms')

const users = []

// Join user to chat
function userJoin(id, username, room){
    const user = {
        id,
        username,
        room,
        color: randomColor(room),
        wins: 0,
        ties: 0
    }
    users.push(user);
    return user
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
    const usedColors = getRoomUsers(room).map(p => p.color)
    colorList = room.availableColors.filter(c => !usedColors.includes(c))
    return colorList[Math.floor(Math.random() * colorList.length)];

}
module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
}