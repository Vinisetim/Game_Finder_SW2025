const searchButton = document.getElementById("search-button"); // Botão de busca
const searchInput = document.getElementById("game-search-input"); // Campo de input
const resultsDisplay = document.getElementById("game-results-display"); // Área de resultados

const API_URL = "http://localhost:3000/api/search"; // URL do backend

function createGameCard(game) {
    const platforms = Array.isArray(game.platforms) ? game.platforms.join(', ') : 'N/A';
    return `
<div class="game-card" data-game-slug="${game.slug}">
        <div class="card-image" style="background-image: url('${game.image}')">
            <div class = "game-rating">RAWG ID: ${game.id}</div> 
        </div>
        <div class="card-details">
            <h3 class="game-title">${game.name}</h3>
            <p><strong>Lançamento:</strong> ${game.released}</p>
            <p><strong>Plataformas:</strong> ${platforms}</p> <div class"store-info-container" id="stores-${game.slug}">
        <p>Buscando preços, descontos e idioma PT-BR nas lojas...</p>
        </div>
        </div>
    </div>
    `;
}

// Função para exibir os resultados na tela
function displayGames(games){
resultsDisplay.innerHTML = '<div class="game-list-container"> </div>';
const container = resultsDisplay.querySelector('.game-list-container');

//Mapeia cada jogo para o html e junta
const gamesHTMl = games.map(createGameCard).join('');
container.innerHTML = gamesHTMl;
}

async function searchGame() {
  resultsDisplay.innerHTML = '<h2 class="loading-message">Buscando...</h2>'; //Limpar resultados anteriores e mostrar mensagem de carregamento

  const gameName = searchInput.value.trim(); //Pega o valor do input e remove espaços extras

  if (gameName === "") {
    resultsDisplay.innerHTML = "<h2>Por favor, digite o nome de um jogo.</h2>";
    return;
  }
  try {
    //Enviar a requisição POST para o servidor
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      // Converte o dado para JSON, com a chave 'gameName' que o backend espera
      body: JSON.stringify({ gameName: gameName }),
    });

    if (!response.ok) {

      //Verificar se a resposta foi bem-sucedida
      throw new Error(`Erro HTTP! Status: ${response.status}`);
    }

    //Converter a resposta para JSON
    const data = await response.json();
    if (data.results && data.results.length > 0){
        displayGames(data.results);
        //Adicionar função para buscar preços nas lojas
        // data.results.forEach(game => fetchPricesAndLanguage(game.slug));

    } else {
      resultsDisplay.innerHTML = `<h2>Nenhum jogo encontrado para "${gameName}".</h2>`;
    }

  } catch (error) {
    // Tratar erros de conexão ou do servidor
    console.error("Erro ao buscar jogo:", error);
    resultsDisplay.innerHTML = `<h2>Erro na Conexão!</h2>
                                    <p>Não foi possível conectar ao servidor. Verifique se o Node.js está rodando em **http://localhost:3000** e se a permissão de rede foi concedida.</p>`;
  }
}

//evento de clique ao botão
searchButton.addEventListener("click", searchGame);

//Adicionar evento para a tecla ENTER no input
searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    searchGame();
  }
});
