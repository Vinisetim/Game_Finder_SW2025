// ======================================================================
// 1. CONSTANTES E VARIÁVEIS GLOBAIS
// ======================================================================

const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("game-search-input");
const resultsDisplay = document.getElementById("game-results-display");

const USD_TO_BRL_RATE = 5.3761; // Taxa de conversão USD -> BRL
const API_URL = "http://localhost:3000/api/search";
const DETAILS_API_URL = "http://localhost:3000/api/game-details";

// Palavras-chave para filtrar resultados CheapShark que não são o jogo base
const NON_GAME_KEYWORDS = [
    "dlc", "soundtrack", "expansion", "pack", "bundle", "edition", "map", 
    "artbook", "wallpaper", "season pass", "ultimate", "deluxe", "gold", 
    "premium" 
];

// Mapeamento CheapShark ID (da API) para o Nome Limpo
const CHEAPSHARK_STORE_MAP = {
    "1": "Steam",
    "2": "GamersGate",
    "3": "GreenManGaming",
    "7": "GOG",
    "8": "Origin (EA App)",
    "11": "Humble Store",
    "13": "Ubisoft Store",
    "25": "Xbox Marketplace", // Microsoft/Xbox
    "29": "Epic Games Store",
    "31": "GOG" // ID 31 é para GOG, mas vamos mapear para 7
};

// ======================================================================
// 2. FUNÇÕES AUXILIARES
// ======================================================================

// Função Simples para simular a avaliação (já que CheapShark e RAWG não fornecem)
function simulateRating(storeName) {
    const name = storeName.toLowerCase();
    if (name.includes('steam')) return 5.0;
    if (name.includes('nintendo')) return 5.0;
    if (name.includes('xbox') || name.includes('microsoft') || name.includes('playstation')) return 3.5;
    return 4.0;
}

// Função para criar o card de loja no formato do protótipo
function createStoreCardHTML(item) {
    const storeName = item.storeName;
    const rating = simulateRating(storeName);
    const ratingStars = '⭐'.repeat(Math.round(rating / 5 * 3)); // 3 estrelas para 5.0

    let priceDisplay;
    let priceValue = Infinity; // Para ordenação
    let normalPriceDisplay = '';
    let linkToUse = item.url;
    let cardClass = 'store-card';
    let cardHeaderContent = storeName;
    const isPCStore = ['Steam', 'GOG', 'Epic Games Store'].includes(storeName);

    // 1. Prioriza o Preço da CheapShark se estiver disponível
    if (item.offer) {
        const offer = item.offer;
        const salePriceBRL = parseFloat(offer.salePrice) * USD_TO_BRL_RATE;
        const normalPriceBRL = parseFloat(offer.normalPrice) * USD_TO_BRL_RATE;

        const formattedSalePrice = salePriceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('R$', '').trim();
        const formattedNormalPrice = normalPriceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('R$', '').trim();
        priceValue = salePriceBRL;

        // Formato: Preço Normal / Preço Promocional ou Preço Promocional / 0,00 (Ex: Steam)
        if (offer.savings > 0) {
             // Oferta: Exibe preço riscado e preço de venda
             normalPriceDisplay = `<span class="strikethrough">${formattedNormalPrice}</span>`;
             priceDisplay = `${normalPriceDisplay} / **${formattedSalePrice}**`;
             cardClass += ' offer-card';
        } else if (storeName.includes('Steam')) {
             // Steam (Preço normal do protótipo)
             priceDisplay = `${formattedSalePrice} / 0,00`;
        } else {
             // Preço normal sem promoção
             priceDisplay = formattedSalePrice;
        }

        linkToUse = offer.link; // Usa o link da CheapShark (mais direto para a oferta)
    } else {
        // 2. Preço Indisponível (Usa N/A)
        priceDisplay = 'N/A';
        priceValue = Infinity;
    }

    // 3. Formatação visual do Cabeçalho (Protótipo)
    const nameLower = storeName.toLowerCase();
    if (nameLower.includes('steam')) {
        cardHeaderContent = '<img src="IMG/steam_logo.png" alt="Steam Logo" class="store-logo"> STEAM®';
    } else if (nameLower.includes('playstation')) {
        cardHeaderContent = '<img src="IMG/ps_logo.png" alt="PlayStation Logo" class="store-logo"> PlayStation Store';
    } else if (nameLower.includes('nintendo')) {
        cardHeaderContent = '<span class="nintendo-eshop-text">Nintendo eShop</span>';
    } else if (nameLower.includes('xbox') || nameLower.includes('microsoft')) {
        cardHeaderContent = '<img src="IMG/microsoft_logo.png" alt="Microsoft Logo" class="store-logo"> Microsoft Store';
    } else {
        cardHeaderContent = `<span class="store-logo-text">${storeName}</span>`; // Loja Padrão
    }
    
    if (isPCStore) {
        cardClass += ' pc-store-card';
    }


    return `
        <div class="${cardClass}" onclick="window.open('${linkToUse}', '_blank')" data-price="${priceValue}" data-pc="${isPCStore ? 'true' : 'false'}"> 
            <div class="card-header">
                ${cardHeaderContent}
            </div>
            <div class="card-body">
                <p>Preço: ${priceDisplay}</p>
                <p>Avaliação: ${rating.toFixed(1)} ${ratingStars}</p>
                <p>PT-BR: Indisponível</p>
            </div>
        </div>
    `;
}


// ======================================================================
// 3. FUNÇÕES PRINCIPAIS
// ======================================================================

// Função para criar o cartão de um jogo (Lista de resultados)
function createGameListItem(game){
    // ... (Mantida igual)
    const plataforms = Array.isArray (game.platforms) ? game.platforms.slice(0,3).join(", ") : "N/A";
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

// Função para exibir os resultados da busca na tela como lista de seleção
function displayGames(games){
    // ... (Mantida igual)
    resultsDisplay.innerHTML = `
        <h2>Resultados da Busca (Clique para Detalhes)</h2>
        <div class="game-list-container">
        ${games.map(createGameListItem).join("")}
        </div>
    `;
}

// Função para exibir os detalhes do jogo (NOVA LÓGICA DE PREÇO/CARD)
function displayGameDetails(game){
    // 1. EXTRAÇÃO DE DADOS 
    // CORRIGIDO: Nome da chave no servidor é 'plataforms' (com 'a')
    const platforms = Array.isArray(game.plataforms) ? game.plataforms : game.platforms || []; 
    const platformsText = platforms.join(", ");

    const developers = Array.isArray(game.developers) ? game.developers.join(", ") : "N/A";
    const genres = Array.isArray(game.genres) ? game.genres.join(", ") : "N/A";
    const descriptionSnippet = game.description ? game.description.substring(0, 500).split(' ').slice(0,-1).join(' ') + "..." : "Descrição indisponível.";

    // 2. PROCESSO DE FILTRO CHEAPSHARK (bestOffers)
    // Coleta a melhor oferta por loja da CheapShark
    let bestOffers = {};
    (game.offers || [])
    .filter(offer => {
        // Se a oferta não tiver nome, ignora
        if (!offer.title) return false;
        
        const csStoreName = CHEAPSHARK_STORE_MAP[offer.storeName] || '';
        const isAllowed = Object.values(CHEAPSHARK_STORE_MAP).includes(csStoreName);

        const offerTitleLower = offer.title.toLowerCase();
        
        // Filtro de DLC menos agressivo: só aplica se o título da oferta for muito diferente do nome do jogo
        const isExtraContent = NON_GAME_KEYWORDS.some(keyword => offerTitleLower.includes(keyword)) && 
                                (offerTitleLower.replace(game.name.toLowerCase(), '').length > 5);

        return isAllowed && !isExtraContent; // Passa no filtro se for loja permitida E não for DLC

    })
    .forEach(offer => {
        const storeID = offer.storeName;
        const salePrice = parseFloat(offer.salePrice);
        // Garante que só a oferta com o menor preço por loja seja salva
        if (!bestOffers[storeID] || salePrice < parseFloat(bestOffers[storeID].salePrice)) {
            bestOffers[storeID] = offer;
        }
    });

    // 3. COMBINAÇÃO DE LOJAS (RAWG + CheapShark)
    // Mapeia lojas RAWG para ofertas CheapShark. Se não encontrar oferta, a loja RAWG é mantida.
    const combinedStores = (game.stores || [])
        // Filtro de segurança: remove lojas nulas ou desconhecidas
        .filter(rawgStore => rawgStore && rawgStore.storeName && rawgStore.storeName.toLowerCase() !== 'loja desconhecida') 
        .map(rawgStore => {
            let offerMatch = null;
            let usedStoreId = null;

            // Tentar encontrar uma oferta CheapShark que corresponda a esta loja RAWG
            for (const storeID in bestOffers) {
                const csStoreName = CHEAPSHARK_STORE_MAP[storeID] || '';
                const rawgNameLower = rawgStore.storeName.toLowerCase();
                const csNameLower = csStoreName.toLowerCase().split('(')[0].trim();

                // Regra de correspondência 1 (Flexível): A loja RAWG contém o nome limpo da CheapShark?
                // Ex: 'PlayStation Store' (RAWG) .includes('playstation')
                if (rawgNameLower.includes(csNameLower) && csNameLower.length > 3){
                    offerMatch = bestOffers[storeID];
                    usedStoreId = storeID;
                    break;
                }
                // Regra de correspondência 2 (Exata): Para lojas específicas que podem dar problema de correspondência parcial
                if ((rawgNameLower === 'steam' || rawgNameLower === 'gog' || rawgNameLower === 'epic games store') && rawgNameLower === csNameLower) {
                    offerMatch = bestOffers[storeID];
                    usedStoreId = storeID;
                    break;
                }
            }

            // Se a oferta foi encontrada, remove-a do pool de bestOffers para não ser usada novamente
            if (offerMatch && usedStoreId) {
                delete bestOffers[usedStoreId]; 
            }

            return{
                ...rawgStore,
                // Prioriza o link da CheapShark se houver oferta, senão usa o link da RAWG.
                url: offerMatch ? offerMatch.link : rawgStore.url,
                offer: offerMatch,
            };
        });

    // 4. ORDENAÇÃO
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

    // 5. RENDERIZAÇÃO
    // Geração do HTML dos cards das lojas
    const storeCardsHtml = orderedStores.map(createStoreCardHTML).join('');

    // MANTENHA ISSO! O console.log foi fundamental para identificar o problema
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


// função para buscar os detalhes do jogo selecionado (mantida)
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
window.handleGameSelection = handleGameSelection; // Expor a função

// Função para buscar jogos da API via backend (mantida)
async function searchGame() {
    // ... (Mantida igual, apenas adicionei o conteúdo que faltava)
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

// Eventos (mantidos)
searchButton.addEventListener("click", searchGame);

searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    searchGame();
  }
});
