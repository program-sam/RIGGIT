function newGame() {
    const form = document.getElementById("newGame");
    const username = form.elements["username"].value;
    if (username) {
        fetch(`/api/makeRoom`).then(res => res.text()).then(res => {
            if (res) {
                window.location.href = `/game?username=${encodeURI(username)}&room=${encodeURI(res)}`;
            }
        });
    }
}

function joinGame() {
    const form = document.getElementById("joinGame");
    const warningText = document.getElementById('joinGame').getElementsByClassName('warning')[0];
    if (!form.elements["room"].value) {
        warningText.innerHTML = 'Enter a room name';
        setTimeout(() => warningText.innerHTML = '', 3000);
        return;
    } else if (!form.elements["username"].value) {
        warningText.innerHTML = 'Enter a username';
        setTimeout(() => warningText.innerHTML = '', 3000);
        return;
    }

    const roomID = form.elements["room"].value || 'invalid';
    fetch(`/api/validateRoom/${roomID}`).then(res => res.text()).then(res => {
        if (res == 'true') {
            form.submit();
        } else {
            warningText.innerHTML = 'Room does not exist';
            setTimeout(() => warningText.innerHTML = '', 3000);
        }
    });
}