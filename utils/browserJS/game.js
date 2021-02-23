let canvas

let gameSettings = { mapHeight: 700, mapWidth: 1200, moveOrder: [], currentPlayer:{} }
let hexes = []

const whiteColor = [255, 255, 255]
const islandColor = [150, 150, 150]

const FR = 15
const ownerAnimationDuration = 0.3 * FR
class Hex {
    constructor(hex) {
        this.x = hex.x;
        this.y = hex.y;
        this.radius = hex.radius;
        this.majority = hex.majority;
        this.owner = hex.owner;
        this.elected = hex.elected;
        this.neighbors = hex.neighbors;
        this.people = hex.people;
        this.turn = hex.turn;
        this.island = hex.island;
        // Parameters for visualization should not be synched with server
        this.ownerTimer = ownerAnimationDuration
    }

    setBaseColor() { 

        stroke(100)
        strokeWeight(2)

        // Background fill
        fill(...whiteColor, 255)
        hexagon(this.x, this.y, this.radius)

        if (this.owner){
            if (this.ownerTimer < ownerAnimationDuration){ this.ownerTimer += 1 }
            if(this.ownerTimer > ownerAnimationDuration) { this.ownerTimer = ownerAnimationDuration }
            fill(...hexToRgb(gameSettings.moveOrder.find(p => p.id == this.owner).color), 100)

            strokeWeight(this.ownerTimer < ownerAnimationDuration ? 0 : 2)
            hexagon(this.x, this.y, this.radius * this.ownerTimer / ownerAnimationDuration)
        } else if (this.island){
            fill(...islandColor, 100)
            hexagon(this.x, this.y, this.radius)
        }

        
    }

    setHoverColor() {
        if (gameSettings.currentPlayer.id != you.id){ return }
        if (this.owner) { return }
        if (this.island){ return }

        const {x, y} = document.getElementById('defaultCanvas0').getBoundingClientRect()
        const hover = sqrt((this.x - mouseX) ** 2 + (this.y - mouseY) ** 2) < this.radius * cos(TWO_PI / 12)
        
        if (hover) { // Hover Selector color
            if(gameSettings.move == 1){ // First move
                fill(...hexToRgb(you.color), 50);
                hexagon(this.x, this.y, this.radius)
            }
            else if (this.neighbors.some(n => n.owner == you.id && n.turn == gameSettings.turnCount)) {
                fill(...hexToRgb(you.color), 50);
                hexagon(this.x, this.y, this.radius)
            }
        }
    }

    show() {

        // Base color
        this.setBaseColor()
        // Stop here when it is just a preview
        if (!ingame){ return }
        // Hover selector
        this.setHoverColor()
        // Population boxes
        let winningPlayer = gameSettings.moveOrder.find(p => p.id == (this.elected || this.majority))
        
        for (let i = 0; i < this.people; i++) {
            if (this.island){ fill(...islandColor) }
            else { fill(...hexToRgb(winningPlayer.color)) }
            strokeWeight(0)
            const blockWidth = this.radius / 4
            const x = this.x - blockWidth * 2 + (i > 2 ? (i - 3) * blockWidth * 1.5 : i * blockWidth * 1.5)
            const y = this.y - blockWidth + (i > 2 ? blockWidth * 1.5 : 0) // start new row after 3 blocks
            rect(x, y, blockWidth, blockWidth)
        }
    }
}

function updateCanvas(){
    const ratio = gameSettings.mapWidth / gameSettings.mapHeight
    if (window.innerWidth / window.innerHeight < ratio){
        document.getElementById('defaultCanvas0').style.width = window.innerWidth * 0.7 + 'px'
        document.getElementById('defaultCanvas0').style.height = window.innerWidth * 0.7 / ratio + 'px'
    } else {
        document.getElementById('defaultCanvas0').style.width = window.innerHeight * 0.8 * ratio + 'px'
        document.getElementById('defaultCanvas0').style.height = window.innerHeight * 0.8 + 'px'
    }
    document.getElementById('gameChat').style.height = document.getElementById('title').offsetHeight + document.getElementById('gameWindow').offsetHeight + 20 + 'px'
}

window.onresize = updateCanvas
window.onload = updateCanvas

function initializeGame(){
    setup()
}

function setup() {
    const canvas = createCanvas(gameSettings.mapWidth, gameSettings.mapHeight);
    canvas.parent(document.getElementById('gameWindow'))
    updateScore(true)
    setTimeout(() => updateCanvas(), 1)
    frameRate(FR)

    // Calculate Hex Neighbors
    for (let i = 0; i < hexes.length; i++) {
        const H = hexes[i]
        for (let j = 0; j < hexes.length; j++) {
            const h = hexes[j]
            if (H == h) { continue }
            if (sqrt((H.x - h.x) ** 2 + (H.y - h.y) ** 2) < H.radius * 2) {
                H.neighbors.push(h)
            }
        }
    }
}

const stateString = () => JSON.stringify({g: gameSettings, h: hexes.map(h => '-' + h.x + h.y + h.elected + h.ownerTimer)})
let prevGameState = stateString()
function draw() {
    // Only do a render cycle when game settings changed, or when you are the player (for hovers)
    if (gameSettings.currentPlayer.id != you.id && prevGameState === stateString()){ return }
    prevGameState = stateString()    
    clear()
    hexes.forEach(h => h.show())
    updateScore(false)
}

function mouseClicked() {
    if (!ingame){return}
    const {x, y} = document.getElementById('defaultCanvas0').getBoundingClientRect()
    if (you.id == gameSettings.currentPlayer.id){ socket.emit('mouseClick', [mouseX, mouseY]) }
}


/// Custom Functions ///

function hexagon(x, y, d) {
    let angle = TWO_PI / 6;
    beginShape();
    for (let a = 0; a < TWO_PI; a += angle) {
        let sx = x + cos(a) * d;
        let sy = y + sin(a) * d;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

function updateScore(init) {
    const scoreRatio = document.getElementById('scoreRatio')

    if (init){ scoreRatio.innerHTML = '' }
    for (let i = 0; i < gameSettings.moveOrder.length; i++) {
        const player = gameSettings.moveOrder[i]
        
        let votes = 0
        if (init){
            scoreRatio.innerHTML += `<span class='${player.id}' style='flex-grow: 0; background-color: ${player.color}'></span>`
        }
        else {
            for (let j = 0; j < hexes.length; j++) {
                if (hexes[j].elected == player.id) { votes += hexes[j].people }
            }
            scoreRatio.getElementsByClassName(player.id)[0].style.flexGrow = votes
        }
    }
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ] : null;
  }