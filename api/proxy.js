// api/proxy.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Permite que o servidor Express entenda corpos de requisição JSON
app.use(express.json());
// Permite que o servidor Express entenda corpos de requisição URL-encoded
app.use(express.urlencoded({ extended: true }));


// Configura o middleware CORS
// Para teste, permite todas as origens.
// Para produção, defina uma whitelist específica para maior segurança.
app.use(cors({
  origin: '*', // Permite todas as origens (para teste). Para produção, mude para um array de domínios: ['https://seusite.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin'], // Cabeçalhos permitidos
}));

// Middleware para processar as requisições de proxy
app.all('/*', async (req, res) => {
  // Pega a URL destino do restante do caminho da requisição (ex: /https://www.google.com -> https://www.google.com)
  const targetUrl = req.originalUrl.substring(1);

  // Valida se a URL é válida
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('URL inválida. Formato esperado: /http(s)://exemplo.com');
  }

  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const response = await axios({
      method: req.method, // Usa o mesmo método HTTP da requisição original (GET, POST, etc.)
      url: targetUrl,
      headers: {
        // Repassa alguns cabeçalhos importantes da requisição original,
        // mas remova aqueles que podem causar problemas ou são irrelevantes para o destino.
        'User-Agent': req.headers['user-agent'] || 'Vercel-CORS-Proxy', // Garante que há um User-Agent
        'Accept': req.headers['accept'],
        'Accept-Encoding': req.headers['accept-encoding'],
        'Connection': 'keep-alive',
        // 'Authorization': req.headers['authorization'], // Descomente se precisar repassar tokens de autenticação
        // 'Content-Type': req.headers['content-type'], // Descomente se precisar repassar o Content-Type para POST/PUT
      },
      data: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body, // Repassa o corpo da requisição para POST/PUT
      responseType: 'arraybuffer', // Para lidar com diferentes tipos de resposta (imagens, JSON, etc.)
    });

    // Repassa os cabeçalhos da resposta do servidor de destino para o cliente
    for (const header in response.headers) {
      // Vercel/Next.js adiciona seus próprios cabeçalhos transfer-encoding, então evitamos sobrescrever.
      if (header.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(header, response.headers[header]);
      }
    }
    res.status(response.status).send(Buffer.from(response.data));

  } catch (error) {
    console.error(`Erro no proxy para ${targetUrl}:`, error.message);
    if (error.response) {
      // O servidor de destino respondeu com um status de erro
      console.error(`Status: ${error.response.status}`);
      console.error(`Dados do erro: ${error.response.data ? error.response.data.toString() : 'N/A'}`);
      res.status(error.response.status).send(error.response.data || 'Erro no servidor de destino');
    } else if (error.request) {
      // A requisição foi feita mas nenhuma resposta foi recebida
      console.error('Nenhuma resposta recebida do servidor de destino.');
      res.status(502).send('Erro: Servidor de destino não respondeu.');
    } else {
      // Algo aconteceu na configuração da requisição que disparou um erro
      console.error('Erro na configuração da requisição de proxy.');
      res.status(500).send('Erro interno do proxy.');
    }
  }
});

// Exporta a instância do Express app como a função serverless
module.exports = app;
