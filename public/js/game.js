"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var canvas;
var gameSettings = {
  mapHeight: 700,
  mapWidth: 1200,
  moveOrder: [],
  currentPlayer: {}
};
var hexes = [];
var whiteColor = [255, 255, 255];
var islandColor = [150, 150, 150];
var FR = 15;
var ownerAnimationDuration = 0.3 * FR;

var Hex = /*#__PURE__*/function () {
  function Hex(hex) {
    _classCallCheck(this, Hex);

    this.x = hex.x;
    this.y = hex.y;
    this.radius = hex.radius;
    this.majority = hex.majority;
    this.owner = hex.owner;
    this.elected = hex.elected;
    this.neighbors = hex.neighbors;
    this.people = hex.people;
    this.turn = hex.turn;
    this.island = hex.island; // Parameters for visualization should not be synched with server

    this.ownerTimer = ownerAnimationDuration;
  }

  _createClass(Hex, [{
    key: "setBaseColor",
    value: function setBaseColor() {
      var _this = this;

      stroke(100);
      strokeWeight(2); // Background fill

      fill.apply(void 0, whiteColor.concat([255]));
      hexagon(this.x, this.y, this.radius);

      if (this.owner) {
        if (this.ownerTimer < ownerAnimationDuration) {
          this.ownerTimer += 1;
        }

        if (this.ownerTimer > ownerAnimationDuration) {
          this.ownerTimer = ownerAnimationDuration;
        }

        fill.apply(void 0, _toConsumableArray(hexToRgb(gameSettings.moveOrder.find(function (p) {
          return p.id == _this.owner;
        }).color)).concat([100]));
        strokeWeight(this.ownerTimer < ownerAnimationDuration ? 0 : 2);
        hexagon(this.x, this.y, this.radius * this.ownerTimer / ownerAnimationDuration);
      } else if (this.island) {
        fill.apply(void 0, islandColor.concat([100]));
        hexagon(this.x, this.y, this.radius);
      }
    }
  }, {
    key: "setHoverColor",
    value: function setHoverColor() {
      if (gameSettings.currentPlayer.id != you.id) {
        return;
      }

      if (this.owner) {
        return;
      }

      if (this.island) {
        return;
      }

      var _document$getElementB = document.getElementById('defaultCanvas0').getBoundingClientRect(),
          x = _document$getElementB.x,
          y = _document$getElementB.y;

      var hover = sqrt(Math.pow(this.x - mouseX, 2) + Math.pow(this.y - mouseY, 2)) < this.radius * cos(TWO_PI / 12);

      if (hover) {
        // Hover Selector color
        if (gameSettings.move == 1) {
          // First move
          fill.apply(void 0, _toConsumableArray(hexToRgb(you.color)).concat([50]));
          hexagon(this.x, this.y, this.radius);
        } else if (this.neighbors.some(function (n) {
          return n.owner == you.id && n.turn == gameSettings.turnCount;
        })) {
          fill.apply(void 0, _toConsumableArray(hexToRgb(you.color)).concat([50]));
          hexagon(this.x, this.y, this.radius);
        }
      }
    }
  }, {
    key: "show",
    value: function show() {
      var _this2 = this;

      // Base color
      this.setBaseColor(); // Stop here when it is just a preview

      if (!ingame) {
        return;
      } // Hover selector


      this.setHoverColor(); // Population boxes

      var winningPlayer = gameSettings.moveOrder.find(function (p) {
        return p.id == (_this2.elected || _this2.majority);
      });

      for (var i = 0; i < this.people; i++) {
        if (this.island) {
          fill.apply(void 0, islandColor);
        } else {
          fill.apply(void 0, _toConsumableArray(hexToRgb(winningPlayer.color)));
        }

        strokeWeight(0);
        var blockWidth = this.radius / 4;
        var x = this.x - blockWidth * 2 + (i > 2 ? (i - 3) * blockWidth * 1.5 : i * blockWidth * 1.5);
        var y = this.y - blockWidth + (i > 2 ? blockWidth * 1.5 : 0); // start new row after 3 blocks

        rect(x, y, blockWidth, blockWidth);
      }
    }
  }]);

  return Hex;
}();

function updateCanvas() {
  var ratio = gameSettings.mapWidth / gameSettings.mapHeight;

  if (window.innerWidth / window.innerHeight < ratio) {
    document.getElementById('defaultCanvas0').style.width = window.innerWidth * 0.7 + 'px';
    document.getElementById('defaultCanvas0').style.height = window.innerWidth * 0.7 / ratio + 'px';
  } else {
    document.getElementById('defaultCanvas0').style.width = window.innerHeight * 0.8 * ratio + 'px';
    document.getElementById('defaultCanvas0').style.height = window.innerHeight * 0.8 + 'px';
  }

  document.getElementById('gameChat').style.height = document.getElementById('title').offsetHeight + document.getElementById('gameWindow').offsetHeight + 20 + 'px';
}

window.onresize = updateCanvas;
window.onload = updateCanvas;

function initializeGame() {
  setup();
}

function setup() {
  var canvas = createCanvas(gameSettings.mapWidth, gameSettings.mapHeight);
  canvas.parent(document.getElementById('gameWindow'));
  updateScore(true);
  frameRate(FR); // Calculate Hex Neighbors

  for (var i = 0; i < hexes.length; i++) {
    var H = hexes[i];

    for (var j = 0; j < hexes.length; j++) {
      var h = hexes[j];

      if (H == h) {
        continue;
      }

      if (sqrt(Math.pow(H.x - h.x, 2) + Math.pow(H.y - h.y, 2)) < H.radius * 2) {
        H.neighbors.push(h);
      }
    }
  }
}

var stateString = function stateString() {
  return JSON.stringify({
    g: gameSettings,
    h: hexes.map(function (h) {
      return '-' + h.x + h.y + h.elected + h.ownerTimer;
    })
  });
};

var prevGameState = stateString();

function draw() {
  // Only do a render cycle when game settings changed, or when you are the player (for hovers)
  if (gameSettings.currentPlayer.id != you.id && prevGameState === stateString()) {
    return;
  }

  prevGameState = stateString();
  clear();
  hexes.forEach(function (h) {
    return h.show();
  });
  updateScore(false);
}

function mouseClicked() {
  if (!ingame) {
    return;
  }

  var _document$getElementB2 = document.getElementById('defaultCanvas0').getBoundingClientRect(),
      x = _document$getElementB2.x,
      y = _document$getElementB2.y;

  if (you.id == gameSettings.currentPlayer.id) {
    socket.emit('mouseClick', [mouseX, mouseY]);
  }
} /// Custom Functions ///


function hexagon(x, y, d) {
  var angle = TWO_PI / 6;
  beginShape();

  for (var a = 0; a < TWO_PI; a += angle) {
    var sx = x + cos(a) * d;
    var sy = y + sin(a) * d;
    vertex(sx, sy);
  }

  endShape(CLOSE);
}

function updateScore(init) {
  var scoreRatio = document.getElementById('scoreRatio');

  if (init) {
    scoreRatio.innerHTML = '';
  }

  for (var i = 0; i < gameSettings.moveOrder.length; i++) {
    var player = gameSettings.moveOrder[i];
    var votes = 0;

    if (init) {
      scoreRatio.innerHTML += "<span class='".concat(player.id, "' style='flex-grow: 0; background-color: ").concat(player.color, "'></span>");
    } else {
      for (var j = 0; j < hexes.length; j++) {
        if (hexes[j].elected == player.id) {
          votes += hexes[j].people;
        }
      }

      scoreRatio.getElementsByClassName(player.id)[0].style.flexGrow = votes;
    }
  }
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}