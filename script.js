// ======================================================================
// 1. CONSTANTES E VARIÁVEIS GLOBAIS
// ======================================================================

const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('game-search-input');
const resultsDisplay = document.getElementById('game-results-display');

const USD_TO_BRL = 5.3761; //taxa de conversão USD para BRL
const API_URL = "http://localhost:3000/api/search";
const DETAILS_API_URL = "http://localhost:3000/api/game-details";

// Palavras-chave para filtrar resultados que não sejam o jogo base (DLC, etc.)
const NON_GAME_KEYWORDS = [
  "dlc", "soundtrack", "expansion", "pack", "bundle", "edition", "map", "artbook", "wallpaper", "season pass", "ultimate", "deluxe", "gold", "premium"
];

// Mapeamento CheapShark ID (da API) para o Nome Limpo
const CHEAPSHARK_STORE_MAP = {
  "1": "Steam",
  "2": "GamersGate",
  "3": "GreenManGaming",
  "7": "GOG",
  "8": "Origin (EA App)",
  "11": "Humble Store",
  "13": "Ubisoft Store", // ID 13 é Ubisoft Store
  "25": "Xbox Marketplace", // ID 25 é Xbox/Microsoft/Windows
  "29": "Epic Games Store",
  "31": "GOG" 
};

const RAWG_ID_TO_NAME_MAP = {
    // IDs comuns da RAWG:
    "1": "Steam",
    "2": "Xbox Marketplace", // Microsoft Store / Xbox Store
    "3": "PlayStation Store",
    "4": "App Store",
    "5": "GOG",
    "6": "Nintendo eShop",
    "7": "Xbox Marketplace", // Outro ID comum para Microsoft/Xbox
    "8": "PlayStation Store", // Outro ID comum para PlayStation
    "9": "Epic Games Store",
    "10": "GOG", // Outro ID GOG
    "11": "Google Play",
    "12": "itch.io",
    "13": "Xbox Marketplace",
    "14": "Web",
    "15": "Google Play",
    "16": "App Store",
    "17": "PlayStation Store",
    "18": "Xbox Marketplace",
    // 19: (sem nome claro)
    "20": "Epic Games Store"
    // Adicione mais conforme identificar nos seus dados, se necessário.
};

// ======================================================================
// 2. FUNÇÕES AUXILIARES
// ======================================================================

// Simulação de Avaliação
function simulateRating(storeName){
  const name = storeName.toLowerCase();
  if (name.includes("steam")) return 5.0;
  if (name.includes("nintendo")) return 2.0;
  if (name.includes("xbox")|| name.includes("microsoft") || name.includes("playstation")) return 3.5;
  return 4.0;
}

// Função para criar o card de loja (GARANTINDO RENDERIZAÇÃO)
function createStoreCardHTML(item){
  const storeName = item.storeName;
  const rating = simulateRating(storeName);
  const ratingStars = '⭐'.repeat(Math.round(rating / 5 * 3));
  let priceDisplay;
  let priceValue = Infinity;
  let normalPriceDisplay = '';
  let linkToUse = item.url || '#'; // Link de segurança
  let cardClass = 'store-card';
  let cardHeaderContent = storeName; 
  // Mapeamento mais abrangente para PC
  const isPCStore = ['Steam', 'GOG', 'Epic Games Store', 'GreenManGaming', 'Humble Store', 'GamersGate'].some(name => storeName.includes(name));

// Verifica se o preço está disponível na CheapShark
if(item.offer){
  const offer = item.offer;
  const salePriceBRL = parseFloat(offer.salePrice) * USD_TO_BRL; 
  const normalPriceBRL = parseFloat(offer.normalPrice) * USD_TO_BRL;

  const formattedSalePrice = salePriceBRL.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('R$', '').trim();
  const formattedNormalPrice = normalPriceBRL.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('R$', '').trim();
  priceValue = salePriceBRL;

  // Preço Normal/ Preço promocional / 0,00
  if (offer.savings > 0) {
    normalPriceDisplay = `<span class="strikethrough">${formattedNormalPrice}</span>`;
    priceDisplay = `${normalPriceDisplay} / **${formattedSalePrice}**`; // Adiciona ** para destaque no preço
    cardClass += ' offer-card';
  } else if(storeName.includes('Steam') && salePriceBRL > 0){
    priceDisplay = `${formattedSalePrice} / 0,00`
  } else{
    priceDisplay = formattedSalePrice;
  }
  linkToUse = offer.link;
} else {
  // Se não houver oferta, exibe "N/A" (Garante que o card renderize)
  priceDisplay = 'N/A'
  priceValue = Infinity;
  linkToUse = item.url || '#';
}

const nameLower = storeName.toLowerCase();
if(nameLower.includes('steam')){
  cardHeaderContent = '<img src="IMG/steam_logo.png" alt="Steam Logo" class="store-logo"> STEAM®';
}
 else if (nameLower.includes('playstation')) {
        cardHeaderContent = '<img src="IMG/ps_logo.png" alt="PlayStation Logo" class="store-logo"> PlayStation Store';
    } else if (nameLower.includes('nintendo')) {
        cardHeaderContent = '<span class="nintendo-eshop-text">Nintendo eShop</span>';
    } else if (nameLower.includes('xbox') || nameLower.includes('microsoft')) {
        cardHeaderContent = '<img src="IMG/microsoft_logo.png" alt="Microsoft Logo" class="store-logo"> Microsoft Store';
    } else {
        cardHeaderContent = `<span class="store-logo-text">${storeName}</span>`; // Loja Padrão
    }
  if(isPCStore){
    cardClass += ' pc-store-card';
  }
  
  // O replace abaixo remove os ** de forma segura.
  const cleanPriceDisplay = priceDisplay.toString().replace(/\*\*/g, '');

  return ` 
        <div class="${cardClass}" onclick="window.open('${linkToUse}', '_blank')" data-price="${priceValue}" data-pc="${isPCStore ? 'true' : 'false'}"> 
            <div class="card-header">
                ${cardHeaderContent}
            </div>
            <div class="card-body">
                <p>Preço: ${cleanPriceDisplay}</p> 
                <p>Avaliação: ${rating.toFixed(1)} ${ratingStars}</p>
                <p>PT-BR: Indisponível</p>
            </div>
        </div>
    `;
}

// ======================================================================
// 3. FUNÇÕES PRINCIPAIS
// ======================================================================

// Função para criar o card do jogo (Lista de Resultados)
function createGameListItem(game){
    // CORRIGIDO: O nome da chave no servidor é 'plataforms' (com 'a')
    const platformsArray = Array.isArray(game.plataforms) ? game.plataforms : game.platforms || [];
    const platformsDisplay = platformsArray.slice(0,3).join(", ") || "N/A";
    
    return `
    <div class="game-list-item" data-game-id="${game.id}"> 
    <img src="${game.image}" alt="${game.name}" class="item-image" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
    <div class="item-details">
        <h3 class="item-title">${game.name}</h3>
        <p class="item-release">Lançamento: ${game.released || 'N/A'}</p>
        <p class="item-platforms">Plataformas: ${platformsDisplay}${platformsArray.length > 3 ? '...' : ''}</p>
    </div>
    <button class="select-button" onclick="handleGameSelection('${game.id}', '${game.name}' )">Ver Detalhes </button>
    </div>
    `;
}

// Função para para exibir os resultados em lista
function displayGames(games){
      resultsDisplay.innerHTML = `
        <h2>Resultados da Busca (Clique para Detalhes)</h2>
        <div class="game-list-container">
        ${games.map(createGameListItem).join("")}
        </div>
    `;
}

// função para exibir os detalhes do jogo selecionado
function displayGameDetails(game){
// CORRIGIDO: Nome da chave no servidor é 'plataforms' (com 'a')
const platforms = Array.isArray(game.plataforms) ? game.plataforms : game.platforms || []; 
const platformsText = platforms.join(", ");

const developers = Array.isArray(game.developers) ? game.developers.join(", ") : "N/A";
const genres = Array.isArray(game.genres) ? game.genres.join(", ") : "N/A";
const descriptionSnippet = game.description ? game.description.substring(0, 500).split(' ').slice(0,-1).join(' ') + "..." : "Descrição indisponível.";

// processo de filtro de dlcs e menor preço
let bestOffers = {};
(game.offers || [])
.filter(offer => {
    // 1. Filtro Básico de Loja Válida
    const storeID = offer.storeID;
    const csStoreName = CHEAPSHARK_STORE_MAP[storeID] || '';
    const isAllowed = !!csStoreName;
    
    // ⚠️ CRÍTICO: Se a loja não estiver mapeada, mostramos o ID.
    if (!isAllowed) {
        console.error(`[CheapShark ERRO] ID da loja não encontrado no CHEAPSHARK_STORE_MAP: ${storeID} (Título da Oferta: ${offer.title})`);
    }

    // Apenas aceita se tiver título E a loja for mapeada.
    return !!offer.title && isAllowed; 
})
.forEach(offer => {
    const storeID = offer.storeID; 
    const salePrice = parseFloat(offer.salePrice);
    
    // Garante que só a oferta com o menor preço por loja seja salva
    if (!bestOffers[storeID] || salePrice < parseFloat(bestOffers[storeID].salePrice)) {
        bestOffers[storeID] = offer;
    }
});

// DEBUG: Agora deve retornar o número de ofertas CheapShark válidas.
console.log("Ofertas CheapShark Válidas (após filtro de DLC - DESATIVADO):", Object.keys(bestOffers).length);

// Combinação de lojas (RAWG + CheapShark)
const combinedStores = (game.stores || [])
    // Filtra por ID RAWG válido para garantir que podemos obter um nome limpo.
    .filter(rawgStore => rawgStore && rawgStore.storeId && rawgStore.storeId !== 'N/A') 
    .map(rawgStore => {
        let offerMatch = null;
        let usedStoreId = null;

        // Tenta obter o nome limpo da RAWG pelo ID.
        // O RAWG_ID_TO_NAME_MAP DEVE ESTAR INSERIDO NO TOPO DO SEU SCRIPT.JS!
        const cleanRawgName = RAWG_ID_TO_NAME_MAP[rawgStore.storeId] || rawgStore.storeName;
        const rawgNameLower = cleanRawgName.toLowerCase().trim();

        // ⚠️ CORREÇÃO CRÍTICA AQUI: Comparação explícita entre lojas que a CheapShark possui.
        for (const storeID in bestOffers) {
            const csStoreName = CHEAPSHARK_STORE_MAP[storeID] || '';
            const csNameLower = csStoreName.toLowerCase().split('(')[0].trim();

            // Lista explícita de lojas que DEVEM ser combinadas
            const isPCStore = ['steam', 'gog', 'epic games store', 'humble store', 'gamersgate', 'greenmangaming', 'ubisoft store', 'xbox marketplace', 'origin (ea app)'];
            
            // Só tentamos combinar se a loja RAWG for uma das que a CheapShark pode cobrir
            if (isPCStore.includes(rawgNameLower)) {
                
                // Correspondência: O nome limpo da RAWG deve ser IGUAL ou CONTER o nome limpo da CheapShark.
                if (rawgNameLower === csNameLower || rawgNameLower.includes(csNameLower)){
                    offerMatch = bestOffers[storeID];
                    usedStoreId = storeID;
                    break;
                }
            }
        }

        // Se a oferta foi encontrada, remove-a do pool de bestOffers
        if (offerMatch && usedStoreId) {
            delete bestOffers[usedStoreId]; 
        }

        // O nome final do card será o nome limpo obtido do ID.
        const finalStoreName = cleanRawgName;
        
        return{
            ...rawgStore,
            storeName: finalStoreName,
            // Se encontrou a oferta CheapShark, prioriza o link dela para o preço/desconto.
            url: offerMatch ? offerMatch.dealID ? `https://www.cheapshark.com/redirect?dealID=${offerMatch.dealID}` : offerMatch.link : rawgStore.url,
            offer: offerMatch,
        };
    });

// ordenação: PC primeiro, depois por preço
const orderedStores = combinedStores.sort((a, b) => {
    const isPCA = ['Steam', 'GOG', 'Epic Games Store'].some(name => a.storeName.includes(name));
    const isPCB = ['Steam', 'GOG', 'Epic Games Store'].some(name => b.storeName.includes(name));

    const priceA = a.offer ? parseFloat(a.offer.salePrice) : Infinity;
    const priceB = b.offer ? parseFloat(b.offer.salePrice) : Infinity;

    // prioridade 1: PC vs Console
    if (isPCA && !isPCB) return -1;
    if (!isPCA && isPCB) return 1;

    return priceA - priceB; // prioridade 2: menor preço
});

// Geração do HTML dos cards das lojas
const storeCardsHtml = orderedStores.map(createStoreCardHTML).join('');

// DEBUG CRÍTICO: Remova ou comente essa linha depois que funcionar!
console.log("Número de lojas após ordenação:", orderedStores.length);
console.log("HTML dos cards (primeiros 500 chars):", storeCardsHtml.substring(0, 500));


const storesHtml = `
    <h3 class="section-title">Lojas Disponíveis (Preços da CheapShark e Links da RAWG)</h3>
    <div class="store-list-container">
        ${storeCardsHtml}
    </div>
`;

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

        ${storesHtml}
    </div>
`;
}

// função para buscar os detalhes do jogo selecionado
async function handleGameSelection(gameId, gameName) {
    resultsDisplay.innerHTML = `<h2>Buscando Detalhes de ${gameName}...</h2>`;

    try {
        const response = await fetch(`${DETAILS_API_URL}/${gameId}`);

        if (!response.ok) {
            throw new Error(`Erro HTTP ao buscar detalhes! Status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.game) {
            displayGameDetails(data.game);
        } else {
            resultsDisplay.innerHTML = `<h2>Erro: Detalhes do jogo ${gameName} não encontrados.</h2>`;
        }
    } catch (error) {
        console.error('Erro ao buscar detalhes do jogo:', error);
        resultsDisplay.innerHTML = `<h2>Erro ao buscar detalhes!</h2>
                                    <p>Não foi possível obter os detalhes do jogo. Detalhes do erro: ${error.message}</p>`;
    }
}
window.handleGameSelection = handleGameSelection;

async function searchGame() {
    resultsDisplay.innerHTML = '<h2>Buscando...</h2>';
    const gameName = searchInput.value.trim();

    if (gameName === "") {
        resultsDisplay.innerHTML = "<h2>Por favor, digite o nome de um jogo.</h2>";
        return;
    }
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameName: gameName }),
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.results && data.results.length > 0){
            displayGames(data.results);
        } else {
            resultsDisplay.innerHTML = `<h2>Nenhum jogo encontrado para "${gameName}".</h2>`;
        }

    } catch (error) {
        console.error("Erro ao buscar jogo:", error);
        resultsDisplay.innerHTML = `<h2>Erro na Conexão!</h2>
                                        <p>Não foi possível conectar ao servidor. Verifique se o Node.js está rodando em **http://localhost:3000** e se a permissão de rede foi concedida.</p>`;
    }
}

// eventos de clique e enter
searchButton.addEventListener("click", searchGame);

searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    searchGame();
  }
});