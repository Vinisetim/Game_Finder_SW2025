function searchGame () {
    const input = document.getElementById('Search');
    const game = input.value.trim();
    if (game === '') {
        document.getElementById('mensagem').innerText = 'Please enter a game name.';
    } else {
        document.getElementById('mensagem').innerText = `Searching for ${game}...`;
    };
};
