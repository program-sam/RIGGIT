
const fs = require('fs');
const rawdata = fs.readFileSync('./utils/countries.geojson');
const countryNames = JSON.parse(rawdata).features.map(cd => cd.properties.CNTRY_NAME)
const colorList = [ '#c04abc', '#d81159', '#a41623', '#c27100', '#FFD23F', '#3da5d9', '#0d5c63', '#29bf12', '#0B032D' ]
countryNames.sort()

const rooms = []

function randomNewID(){
    const zn = ['accusation', 'allegation', 'alliance', 'bribe', 'debacle', 'deficit', 'empire', 'fiasco', 'privilege', 'scandal', 'party', 'ballot', 'campaign', 'coalition', 'law', 'lobby', 'policy', 'regime', 'republic', 'election', 'vote', 'candidate', 'nominee', 'partisan', 'office']
    const bn = ['accused', 'guilty', 'blamed', 'bribed', 'claimed', 'conealed', 'corrupt', 'covert', 'denied', 'exposed', 'greedy', 'illegal', 'illicit', 'laconic', 'obscure', 'partial', 'reckless', 'tainted', 'unjust', 'biassed', 'vulgar', 'shallow', 'radical', 'cheap', 'stupid', 'brutal']
    const bbn = ['beefy', 'big', 'broad', 'bulky', 'chunky', 'colossal', 'cosmic', 'endless', 'epic', 'giant', 'grand', 'great', 'huge', 'large', 'little', 'massive', 'measly', 'meager', 'mini', 'petite', 'puny', 'short', 'sizable', 'small', 'teensy', 'teeny', 'tall', 'tiny', 'thick', 'vast']
    
    let code = ''
    let attempt = 0
    while (attempt < 20){
        attempt += 1
        code = `${bbn[Math.floor(Math.random() * bbn.length)]} ${bn[Math.floor(Math.random() * bn.length)]} ${zn[Math.floor(Math.random() * zn.length)]}`
        console.log(code)
        if (!rooms.map(r => r.id).includes(code)){ return code }
    }
    return Math.random().toString(36).substring(7)
}


function makeRoom(){
    const room = {
        id: randomNewID(),
        gameStarted: new Date(),
        ingame: false,
        availableColors: colorList,
        availableCountries: countryNames,
        settings: {
            gridShape: 'Rectangle',
            radius: 30,
            stroke: 2,
            hexPerTurn: 5
        },
        game: {}
    }
    rooms.push(room)
    return room
}

function checkRoom(id){
    return rooms.map(r => r.id).includes(id)
}

function getRoom(id){
    return (rooms.find(room => room.id === id))
}

function removeRoom(id){
    const index = rooms.findIndex(room => room.id === id)
    if (index !== -1){
        return rooms.splice(index, 1)[0]
    }
}

module.exports = {
    makeRoom,
    checkRoom,
    getRoom,
    removeRoom
}