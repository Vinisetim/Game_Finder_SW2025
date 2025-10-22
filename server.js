// Importa o framework Express e o pacote CORS
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// Inicializa o aplicativo Express
const app = express();
const port = 3000; // Porta onde o servidor irá escutar

const RAWG_API_KEY = "919ae0f52fcd4858835eeed19e16ecf0";
const RAWG_BASE_URL = "https://api.rawg.io/api/games";

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
    //Busca para detalhes do jogo
    const detailsResponse = await axios.get(`${RAWG_BASE_URL}/${gameId}`, {
      params: { key: RAWG_API_KEY },
    });
    const gameDetails = detailsResponse.data;

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
     stores: gameStores.map((s) => ({
    // Usa o Optional Chaining: só tenta ler .id se .store existir
    storeId: s.store?.id || s.id || 'N/A', 
    storeName: s.store?.name || s.name || 'Loja Desconhecida',
    url: s.url,
}))
    };
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
