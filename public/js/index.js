"use strict";

function newGame() {
  var form = document.getElementById("newGame");
  var username = form.elements["username"].value;

  if (username) {
    fetch("/api/makeRoom").then(function (res) {
      return res.text();
    }).then(function (res) {
      if (res) {
        window.location.href = "/game?username=".concat(encodeURI(username), "&room=").concat(encodeURI(res));
      }
    });
  }
}

function joinGame() {
  var form = document.getElementById("joinGame");
  var warningText = document.getElementById('joinGame').getElementsByClassName('warning')[0];

  if (!form.elements["room"].value) {
    warningText.innerHTML = 'Enter a room name';
    setTimeout(function () {
      return warningText.innerHTML = '';
    }, 3000);
    return;
  } else if (!form.elements["username"].value) {
    warningText.innerHTML = 'Enter a username';
    setTimeout(function () {
      return warningText.innerHTML = '';
    }, 3000);
    return;
  }

  var roomID = form.elements["room"].value || 'invalid';
  fetch("/api/validateRoom/".concat(roomID)).then(function (res) {
    return res.text();
  }).then(function (res) {
    if (res == 'true') {
      form.submit();
    } else {
      warningText.innerHTML = 'Room does not exist';
      setTimeout(function () {
        return warningText.innerHTML = '';
      }, 3000);
    }
  });
}