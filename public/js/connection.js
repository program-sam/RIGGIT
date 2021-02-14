"use strict";

var socket = io();
var colorList = ['#c04abc', '#d81159', '#a41623', '#c27100', '#FFD23F', '#3da5d9', '#0d5c63', '#29bf12', '#0B032D'];
var win = new Audio('aud/win.mp3');
var yourTurn = new Audio('aud/yourTurn.mp3'); // Get username and room from URL

var _Qs$parse = Qs.parse(location.search, {
  ignoreQueryPrefix: true
}),
    username = _Qs$parse.username,
    room = _Qs$parse.room;

if (!username || !room) {
  window.location.href = '/';
}

window.history.replaceState({}, document.title, "/game");
var ingame = false;
var players = [];
var you = {};
fetch("/api/validateRoom/".concat(room)).then(function (res) {
  return res.text();
}).then(function (res) {
  if (res == 'true') {
    socket.emit('joinRoom', {
      username: username,
      roomid: room
    });
    document.getElementById('title').innerHTML = room.toUpperCase(); // When a game was joined, add an event listener to warn the user when he leaves

    window.addEventListener("beforeunload", function (e) {
      if (!ingame) {
        return undefined;
      }

      var confirmationMessage = 'You are about to leave the current game. ' + 'If you leave the current game will end and your score will be lost.';
      (e || window.event).returnValue = confirmationMessage; //Gecko + IE

      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    });
  } else {
    window.location.href = '/';
  }
});
socket.on('message', function (message) {
  document.getElementById('chatMessages').innerHTML += "<div class='chatMessage ".concat(message.id == you.id ? 'you' : '', "'><strong>").concat(message.username, ":</strong> ").concat(message.text, "</div>");
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
});
socket.on('roominfo', function (data) {
  players = data.users;
  you = players.find(function (p) {
    return p.id == socket.id;
  });
  var usedColors = players.map(function (p) {
    return p.color.toLowerCase();
  });
  colorList = data.room.availableColors.filter(function (c) {
    return !usedColors.includes(c.toLowerCase());
  });
  document.getElementById('gridShape').innerHTML = '<optgroup label="Shapes"><option value="Rectangle">Rectangle</option></optgroup><optgroup label="Countries">';
  data.room.availableCountries.map(function (c) {
    document.getElementById('gridShape').innerHTML += "<option ".concat(c == data.room.settings.gridShape ? 'selected' : '', " value='").concat(c, "'>").concat(c, "</option>");
  });
  document.getElementById('gridShape').innerHTML += '</optgroup>';
  var table = document.getElementById('playerList');
  var playerBox = document.getElementById('playerBox');
  table.innerHTML = '';

  for (var i = 0; i < players.length; i++) {
    var player = players[i]; // Edit table in lobby

    table.innerHTML += "<tr>\n            <td>".concat(player.username, "</td>\n            <td><div class=\"picker ").concat(player.id, "\" style='background-color: ").concat(player.color, "'></div></td>\n            <td>").concat(player.wins, "</td>\n            <td>").concat(player.ties, "</td>    \n        </tr>");
  }

  $(".".concat(you.id)).colorPick({
    'allowRecent': false,
    'initialColor': you.color,
    'palette': colorList,
    'onColorSelected': function onColorSelected() {
      this.element.css({
        'backgroundColor': this.color,
        'color': this.color
      });

      if (this.color.toUpperCase() != you.color.toUpperCase()) {
        socket.emit('changeColor', this.color);
      }
    }
  });
  ingame = data.room.ingame;

  if (ingame) {
    document.getElementById('lobby').style.top = '-300%';
    gameSettings = data.room.game.gameSettings;
  } else {
    document.getElementById('lobby').style.top = 'initial';
  }

  document.getElementById('cellSize').value = data.room.settings.radius;
  document.getElementById('cellSizeText').value = data.room.settings.radius;
  drawPlayerBox(data.room.game.gameSettings || gameSettings, players, data.room.game.hexes);
});
var itIsYourTurn = false;
socket.on('gameStarted', function (message) {
  hexes = message.hexes.map(function (h) {
    return new Hex(h);
  });
  gameSettings = message.gameSettings;
  ingame = true;
  initializeGame();
  drawPlayerBox(gameSettings, players, message.hexes);
  document.getElementById('lobby').style.top = '-300%';

  if (!itIsYourTurn && gameSettings.currentPlayer.id == you.id) {
    itIsYourTurn = true;
    yourTurn.play();
  }
});
socket.on('gameData', function (message) {
  // Do not simply create a new list because neighbors are only calculated on init
  hexes.map(function (h, i) {
    h.majority = message.hexes[i].majority;
    h.ownerTimer = h.owner == message.hexes[i].owner ? h.ownerTimer : 0;
    h.owner = message.hexes[i].owner;
    h.elected = message.hexes[i].elected;
    h.turn = message.hexes[i].turn;
    h.island = message.hexes[i].island;
  });
  gameSettings = message.gameSettings;
  drawPlayerBox(gameSettings, players, message.hexes);

  if (!itIsYourTurn && gameSettings.currentPlayer.id == you.id) {
    itIsYourTurn = true;
    yourTurn.play();
  } else if (itIsYourTurn && gameSettings.currentPlayer.id != you.id) {
    itIsYourTurn = false;
  }
});
socket.on('gameOver', function (players) {
  // Handle winners events
  document.getElementById('popup').innerHTML = '';
  var pNames = players.map(function (p) {
    return p.username;
  });

  if (pNames.length == 1) {
    document.getElementById('popup').innerHTML = pNames[0] + ' won this game!';
  } else if (pNames.length > 1) {
    var lastPlayer = pNames.splice(-1, 1)[0];
    document.getElementById('popup').innerHTML = pNames.join(', ').slice(0, -2) + ' and ' + lastPlayer + ' are worthy opponents!';
  } else {
    return;
  }

  document.getElementById('popup').classList.add("show");
  document.getElementById('fade').classList.toggle('show');
  document.getElementById('buymeacoffee').style.visibility = 'visible';
  setTimeout(function () {
    document.getElementById('popup').classList.remove("show");
    document.getElementById('fade').classList.remove('show');
  }, 3000); // Launch the confetti cannons!

  setTimeout(function () {
    win.play();
    var cannon = document.createElement('canvas');
    cannon.width = window.innerWidth * 0.9;
    cannon.height = window.innerHeight * 0.9;
    cannon.style.position = 'absolute';
    cannon.style.top = '0';
    cannon.style.bottom = '0';
    document.body.appendChild(cannon);
    var myConfetti1 = confetti.create(cannon, {
      resize: true,
      useWorker: true
    });
    myConfetti1({
      particleCount: 150,
      startVelocity: 50,
      decay: 0.95,
      scalar: 1.2,
      spread: 45,
      angle: 35,
      origin: {
        x: 0,
        y: 1
      }
    });
    var myConfetti2 = confetti.create(cannon, {
      resize: true,
      useWorker: true
    });
    myConfetti2({
      particleCount: 150,
      startVelocity: 50,
      decay: 0.95,
      scalar: 1.2,
      spread: 45,
      angle: 145,
      origin: {
        x: 1,
        y: 1
      }
    });
    setTimeout(function () {
      myConfetti1.reset();
      myConfetti2.reset();
      cannon.remove();
    }, 2500);
  }, 500);
});
socket.on('gamePreview', function (previewHexes) {
  hexes = previewHexes.map(function (h) {
    return new Hex(h);
  });
});

function sendMessage() {
  var content = document.getElementById('chatInput');

  if (content.value) {
    socket.emit('chatMessage', content.value);
    content.value = '';
  }
}

function startGame() {
  socket.emit('startGame');
}

function updateSettings() {
  var cellSize = document.getElementById('cellSize');
  var gridShape = document.getElementById('gridShape');

  if (cellSize.value) {
    socket.emit('updateSettings', {
      cellSize: cellSize.value,
      gridShape: gridShape.value
    });
  }
}

function drawPlayerBox(gs, players, hexes) {
  document.getElementById('playerBox').innerHTML = '';

  var _loop = function _loop(i) {
    var player = gs.moveOrder[i];
    var scoreCount = hexes.reduce(function (acc, cur) {
      return cur.elected == player.id ? acc + parseInt(cur.people) : acc;
    }, 0);
    playerBox.innerHTML += "\n            <div class='player ".concat(player.id == gs.currentPlayer.id ? 'current' : '', "'> <span style='background-color: ").concat(player.color, "'></span>\n            <p class='playerName'>").concat(player.username, "</p><p class='playerScore'>").concat(scoreCount, "</p></div> ");
  };

  for (var i = 0; i < gs.moveOrder.length; i++) {
    _loop(i);
  }

  for (var _i = 0; _i < players.length; _i++) {
    var player = players[_i];

    if (gs.moveOrder.map(function (m) {
      return m.id;
    }).includes(player.id)) {
      continue;
    }

    playerBox.innerHTML += "\n            <div class='player ".concat(ingame ? 'watching' : '', "'> <span style='background-color: ").concat(player.color, "'></span>\n            <p>").concat(player.username, "</p> </div> ");
  }
}