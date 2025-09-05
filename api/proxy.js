// api/proxy.js
import fetch from 'node-fetch';

export default async function (req, res) {
  try {
    console.log('Original req.url:', req.url); // Mantém o log para depuração

    let decodedUrlPath = decodeURIComponent(req.url.slice(1)); 
    let targetUrl = decodedUrlPath;

    // --- NOVO CÓDIGO AQUI: Adiciona a segunda barra se estiver faltando ---
    if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'http://');
    } else if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    }
    // --- FIM DO NOVO CÓDIGO ---

    console.log('Processed targetUrl (after fix):', targetUrl); // Loga a URL após a correção

    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
        console.error('Invalid target URL detected - Final check failed:', targetUrl); 
        return res.status(400).send('URL de destino inválida. Deve começar com http:// ou https://.');
    }

    // --- Tratamento da Requisição de Pré-Voo (OPTIONS) ---
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://v0-brazilian-portuguese-prompts.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }

    // --- Restante do seu código (sem alterações a partir daqui) ---
    const { method, headers, body } = req;

    const filteredHeaders = {};
    for (const key in headers) {
      if (!['host', 'connection', 'content-length', 'content-encoding'].includes(key.toLowerCase())) {
        filteredHeaders[key] = headers[key];
      }
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: filteredHeaders,
      body: method === 'POST' || method === 'PUT' ? JSON.stringify(body) : undefined,
    });

    res.setHeader('Access-Control-Allow-Origin', 'https://v0-brazilian-portuguese-prompts.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    response.headers.forEach((value, name) => {
        if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'content-encoding'].includes(name.toLowerCase())) {
            res.setHeader(name, value);
        }
    });

    res.status(response.status).send(await response.buffer());

  } catch (error) {
    console.error('Erro no Proxy:', error);
    res.status(500).send('Erro interno do Proxy. Verifique os logs do Vercel.');
  }
}
