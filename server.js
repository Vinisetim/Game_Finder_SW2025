// Importa o framework Express e o pacote CORS
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// Inicializa o aplicativo Express
const app = express();
const port = 3000; // Porta onde o servidor irá escutar

//API RAWG
const RAWG_API_KEY = "919ae0f52fcd4858835eeed19e16ecf0";
const RAWG_BASE_URL = "https://api.rawg.io/api/games";

//API CheapShark
const CHEAPSHARK_BASE_URL = "https://www.cheapshark.com/api/1.0";
const CHEAPSHARK_STORE_MAP = {
    // Normalizamos os nomes para que batam com a RAWG
    "1": "Steam",
    "2": "GamersGate",
    "3": "GreenManGaming",
    "7": "GOG",
    "8": "Origin", 
    "11": "Humble Store",
    "13": "Ubisoft Store",
    "25": "Xbox Marketplace", // O nome da loja CheapShark para a Microsoft Store
    "29": "Epic Games Store",
    // Adicionamos os problemáticos para registrar, mas com um nome de 'IGNORAR'
    "21": "IGNORAR_21", 
    "28": "IGNORAR_28",
};

function normalizeRawgStoreName(rawgName) {
    if (rawgName.includes("GOG")) return "GOG";
    if (rawgName.includes("Microsoft")) return "Xbox Marketplace";
    if (rawgName.includes("Origin")) return "Origin";
    // Adicione outras normalizações conforme necessário
    return rawgName;
}
// Middleware (funções que rodam antes da rota)
app.use(cors()); // Habilita CORS para permitir requisições de diferentes origens
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// Rota POST para /api/search.
app.post("/api/search", async (req, res) => {
  const gameName = req.body.gameName;
  if (!gameName) {
    return res.status(400).json({ error: "Termo de busca não fornecido." });
  }
  console.log(`Recebido pedido de busca para: ${gameName}`); //Resposta em caso de sucesso

  try {
    //requisitar lista de jogos que batem com o nome
    const response = await axios.get(RAWG_BASE_URL, {
      params: {
        key: RAWG_API_KEY,
        search: gameName,
        page_size: 5, // Limita a 5 resultados
        search_precise: false, // Busca aproximada
      },
    });
    const rawgGames = response.data.results;

    if (rawgGames.length === 0) {
      return res.json({
        message: `Nenhum jogo encontrado para: ${gameName}`,
        results: [],
      });
    }

    const simpleResults = rawgGames.map((game) => ({
      id: game.id,
      slug: game.slug,
      name: game.name,
      released: game.released,
      image: game.background_image,
      //simplificando as plataformas disponíveis
      platforms: game.platforms
        ? game.platforms.map((p) => p.platform.name)
        : [],
    }));

    res.json({
      message: `[SUCESSO RAWG] Encontrados ${simpleResults.length} jogos para: ${gameName}`,
      results: simpleResults,
    });
  } catch (error) {
    console.error("ERRO RAWG API:", error.message);
    res.status(500).json({
      error:
        "Erro ao comunicar com a API RAWG durante a busca. Tente novamente mais tarde.",
      // details: error.response?.data?.detail || "Erro de conexão ou servidor",
    });
  }
});

//Rota 2: Detalhes para lojas do jogo

app.get("/api/game-details/:id", async (req, res) => {
  const gameId = req.params.id;
  if (!gameId) {
    return res.status(400).json({
      error: "ID do jogo não fornecido.",
    });
  }
  console.log(`Recebido pedido de detalhes para o jogo com ID: ${gameId}`);

  try {
    //Busca para detalhes do jogo incluindo os preços
    const detailsResponse = await axios.get(`${RAWG_BASE_URL}/${gameId}`, {
      params: { key: RAWG_API_KEY },
    });
    const gameDetails = detailsResponse.data;

    const gameName = gameDetails.name;
    let offers = [];

    try {
      const offersResponse = await axios.get(`${CHEAPSHARK_BASE_URL}/deals`, {
        params: {
          title: gameName,
          limit: 60, // ⬆️ Aumentado o limite de 5 para 60 para buscar mais ofertas
        },
      });
      
      offers = offersResponse.data.map((offer) => ({
        // 🚨 CORREÇÃO 1: O frontend espera 'storeID' para fazer o mapeamento.
        storeID: offer.storeID, 
        salePrice: offer.salePrice,
        normalPrice: offer.normalPrice,
        savings: offer.savings,
        dealID: offer.dealID,
        link: `https://www.cheapshark.com/redirect?dealID=${offer.dealID}`,
        
        // 🚨 CORREÇÃO 2: O endpoint /deals não retorna 'title'. 
        // Usamos o gameName da busca, garantindo que o filtro de DLC do frontend funcione.
        title: gameName,
      }));

    } catch (error) {
        console.error("Erro ao buscar ofertas CheapShark:", error.message);
        offers = []; // Em caso de erro, retorna um array vazio
    }
    //Busca para lojas do jogo
    const storesResponse = await axios.get(
      `${RAWG_BASE_URL}/${gameId}/stores`,
      {
        params: { key: RAWG_API_KEY },
      }
    );
    const gameStores = storesResponse.data.results;

    // Simplificar e combinar os dados
    const detailedGame = {
      id: gameDetails.id,
      name: gameDetails.name,
      description: gameDetails.description_raw,
      released: gameDetails.released,
      image: gameDetails.background_image,
      website: gameDetails.website,
      metacritic: gameDetails.metacritic,
      developers: gameDetails.developers
        ? gameDetails.developers.map((d) => d.name)
        : [],
      genres: gameDetails.genres ? gameDetails.genres.map((g) => g.name) : [],
      plataforms: gameDetails.platforms
        ? gameDetails.platforms.map((p) => p.platform.name)
        : [],
      offers: offers,
      stores: gameStores.map((s) => ({
        storeId: s.store?.id || s.id || "N/A",
        storeName: s.store?.name || s.name || "Loja Desconhecida",
        url: s.url,
      })),
    };
    console.log("RAWG Lojas Retornadas:", detailedGame.stores.map(s => s.storeName));
    console.log("CheapShark Ofertas Retornadas:", detailedGame.offers.length);
    console.log(
      "DADOS DO JOGO C/ IDIOMAS/RATING:",
      detailedGame.esrbRating,
      detailedGame.languages
    );
    res.json({
      message: `[SUCESSO RAWG] Detalhes encontrados para o jogo ID: ${gameId}`,
      game: detailedGame,
    });
  } catch (error) {
    console.log("ERRO RAWG API (Detalhes):", error.message);
    const status = error.response && error.response.status === 404 ? 404 : 500;
    res.status(status).json({
      error: `Erro ao obter detalhes para o jogo ID: ${gameId}. Detalhes do erro: ${error.message}`,
    });
  }
});
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log("Backend pronto para receber requisições...");
});
