require("dotenv").config(); // <-- carrega as variáveis do .env

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================================
// VARIÁVEIS DE AMBIENTE
// ================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BRAPI_KEY = process.env.BRAPI_KEY;
const PORT = process.env.PORT || 3000;

// ================================
// CLIENTE SUPABASE VIA REST
// ================================
const supabase = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  },
});

// ================================
// FUNÇÃO: BUSCAR PREÇO NA BRAPI
// ================================
async function getLivePrice(ticker) {
  try {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_KEY}`;
    const { data } = await axios.get(url);

    const price = data?.results?.[0]?.regularMarketPrice;
    return price || null;
  } catch (err) {
    console.log("Erro BRAPI →", ticker, err.message);
    return null;
  }
}

// ================================
// ROTA PRINCIPAL: /portfolios
// AGREGA profiles + tickers + options + preço ao vivo
// ================================
app.get("/portfolios", async (req, res) => {
  try {
    const [profilesRes, tickersRes, optionsRes] = await Promise.all([
      supabase.get("/profiles?select=*"),
      supabase.get("/tickers?select=*"),
      supabase.get("/options?select=*"),
    ]);

    const profiles = profilesRes.data;
    const tickers = tickersRes.data;
    const options = optionsRes.data;

    const portfolios = [];

    for (const user of profiles) {
      const userTickers = tickers.filter((t) => t.user_id === user.id);

      const acoes = [];
      for (const t of userTickers) {
        const livePrice = await getLivePrice(t.ticker);

        const relatedOptions = options.filter(
          (o) => o.ticker_id === t.id && o.user_id === user.id
        );

        acoes.push({
          ticker_acao: t.ticker,
          qtd_acao: t.qtd_compra,
          preco_medio: t.preco_medio,
          preco_ao_vivo_acao: livePrice,
          opcoes: relatedOptions,
        });
      }

      portfolios.push({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        acoes,
      });
    }

    return res.json(portfolios);
  } catch (err) {
    console.error("Erro geral no /portfolios:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================================
// INICIAR O SERVIDOR
// ================================
app.listen(PORT, () => {
  console.log(`🔥 API rodando na porta ${PORT}`);
});
