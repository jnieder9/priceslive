import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BRAPI_KEY = process.env.BRAPI_KEY;

const supabase = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: "application/json",
  },
});

async function getPrice(ticker) {
  try {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_KEY}`;
    const response = await axios.get(url);

    if (!response.data || !response.data.results || !response.data.results[0]) {
      return null;
    }

    return response.data.results[0].regularMarketPrice;
  } catch {
    return null;
  }
}

app.get("/portfolios", async (req, res) => {
  try {
    console.log("📡 Carregando profiles…");
    const { data: profiles } = await supabase.get("/profiles?select=*");

    console.log("📡 Carregando tickers…");
    const { data: tickers } = await supabase.get("/tickers?select=*");

    console.log("📡 Carregando options…");
    const { data: options } = await supabase.get("/options?select=*");

    const portfolios = [];

    for (const profile of profiles) {
      const userTickers = tickers.filter(t => t.user_id === profile.id);
      const userOptions = options.filter(o => o.user_id === profile.id);

      for (const t of userTickers) {
        t.livePrice = await getPrice(t.ticker);
      }

      const portfolio = {
        user_id: profile.id,
        name: profile.name,
        email: profile.email,
        tickers: userTickers,
        options: userOptions,
      };

      portfolios.push(portfolio);
    }

    return res.json(portfolios);
  } catch (err) {
    console.error("🔥 ERRO GERAL:");
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 API rodando na porta ${PORT}`);
});
