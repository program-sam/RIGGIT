function formatMessage(user, text){
    return {
        username: user.username,
        id: user.id,
        text
    }
}

module.exports = { formatMessage }