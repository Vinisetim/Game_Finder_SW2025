const searchButton = document.getElementById("search-button"); // Botão de busca
const searchInput = document.getElementById("game-search-input"); // Campo de input
const resultsDisplay = document.getElementById("game-results-display"); // Área de resultados

const API_URL = "http://localhost:3000/api/search"; // URL do backend
const DETAILS_API_URL = "http://localhost:3000/api/game-details"; //URL backend para detalhes

// Função para criar o cartão de um jogo

function createGameListItem(game){
  const plataforms = Array.isArray (game.platforms) ? game.platforms.slice(0,3).join(", ") : "N/A";
  //Evento onclick chamando o ID do jogo
  return `
  <div class="game-list-item" data-game-id="${game.id}"> 
  <img src="${game.image}" alt="${game.name}" class="item-image" onerror=null; this.src='https://via.placeholder.com/150';>
  <div class="item-details">
      <h3 class="item-title">${game.name}</h3>
      <p class="item-release">Lançamento: ${game.released || 'N/A'}</p>
      <p class="item-platforms">Plataformas: ${plataforms}${game.platforms.length > 3 ? '...' : ''}</p>
  </div>
  <button class="select-button" onclick="handleGameSelection('${game.id}', '${game.name}' )">Ver Detalhes </button>
  </div>
  `;
}

//Função para exibir os resultados da busca na tela como lista de seleção
function displayGames(games){
  resultsDisplay.innerHTML = `
      <h2>Resultados da Busca (Clique para Detalhes)</h2>
    <div class="game-list-container">
        ${games.map(createGameListItem).join("")}
    </div>
  `;
}
//Função para exibir o cartão de um jogo
function displayGames(games){
  resultsDisplay.innerHTML = `
      <h2>Resultados da Busca (Clique para detalhes)</h2>
      <div class="game-list-container">
      ${games.map(createGameListItem).join("")}
      </div>
  `;
}

//Parte 2 ∑(; °Д°)

function displayGameDetails(game){
  // CORREÇÃO: Usar consistentemente 'plataforms' (com 'a')
  const platformsText = Array.isArray (game.plataforms) ? game.plataforms.join(", ") : "N/A";
  const developers = Array.isArray (game.developers) ? game.developers.join(", ") : "N/A";
  const genres = Array.isArray (game.genres) ? game.genres.join(", ") : "N/A";
  //aqui é para pegar as primeiras 500 letras da descrição, sem quebrar palavras
  const descriptionSnippet = game.description ? game.description.substring(0,500).split(' ').slice(0,-1).join(' ') + '...' : 'Descrição não disponível.';



//Lista de jogos da API RAWG, aqui é para eu integrar a busca de preços de outras APIs
    const storesList = game.stores.length > 0
        ? game.stores.map(store => `<li><a href="${store.url}" target="_blank">${store.storeName}</a></li>`).join('')
        : '<li>Nenhuma loja oficial encontrada na RAWG.</li>';
        
    resultsDisplay.innerHTML = `
        <div class="game-details-card">
            <button class="back-button" onclick="document.location.reload()">Voltar à Busca</button>
            <img src="${game.image}" alt="${game.name}" class="details-image" onerror="this.onerror=null;this.src='https://via.placeholder.com/460';">
            <h2 class="details-title">${game.name}</h2>
            <p><strong>Metacritic:</strong> ${game.metacritic || 'N/A'}</p>
            <p><strong>Lançamento:</strong> ${game.released || 'N/A'}</p>
            <p><strong>Desenvolvedor:</strong> ${developers}</p>
            <p><strong>Gêneros:</strong> ${genres}</p>
            <p><strong>Plataformas:</strong> ${platformsText}</p>
            
            <h3>Descrição</h3>
            <p class="details-description">${descriptionSnippet}</p>

            <h3>Onde Comprar (Lojas RAWG)</h3>
            <ul class="store-list">${storesList}</ul>
            
            ${game.website ? `<p><a href="${game.website}" target="_blank">Website Oficial</a></p>` : ''}
        </div>
    `;
}

// função para buscar os detalhes do jogo selecionado
async function handleGameSelection(gameId, gameName) {
    // Exibe uma mensagem de carregamento enquanto busca os detalhes
    resultsDisplay.innerHTML = `<h2>Buscando Detalhes de ${gameName}...</h2>`;

    try {
        const response = await fetch(`${DETAILS_API_URL}/${gameId}`);

        if (!response.ok) {
            // Se a resposta HTTP não for bem-sucedida (ex: 404, 500), lança um erro
            throw new Error(`Erro HTTP ao buscar detalhes! Status: ${response.status}`);
        }

        const data = await response.json(); // Converte a resposta para JSON
        
        // Verifica se o backend retornou os dados do jogo
        if (data.game) {
            displayGameDetails(data.game); // Chama a função para exibir os detalhes
        } else {
            // Se o backend não retornou 'data.game', exibe uma mensagem de erro
            resultsDisplay.innerHTML = `<h2>Erro: Detalhes do jogo ${gameName} não encontrados.</h2>`;
        }
    } catch (error) {
        // Captura e exibe qualquer erro que ocorra durante o fetch ou processamento
        console.error('Erro ao buscar detalhes do jogo:', error);
        resultsDisplay.innerHTML = `<h2>Erro ao buscar detalhes!</h2>
                                    <p>Não foi possível obter os detalhes do jogo. Detalhes do erro: ${error.message}</p>`;
    }
}
window.handleGameSelection = handleGameSelection; // A função é exposta globalmente para ser usada pelo 'onclick'
// Função para buscar jogos da API via backend
async function searchGame() {
  resultsDisplay.innerHTML = '<h2>Buscando...</h2>'; //Limpar resultados anteriores e mostrar mensagem de carregamento
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

