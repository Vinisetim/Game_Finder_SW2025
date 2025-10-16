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

// Criação da Rota de Busca (Endpoint)
// Rota POST para /api/search. SearchTerm recebe o texto digitado no input
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
      error: "Erro na API Externa. Verifique a chave ou o limite de uso.",
      details: error.response?.data?.detail || "Erro de conexão ou servidor",
    });
  }
});
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log("Backend pronto para receber requisições...");
});
