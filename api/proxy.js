// api/proxy.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // A URL de destino é o que vem após a URL do seu proxy.
    // Ex: proxy.vercel.app/https://script.google.com/macros/s/.../exec
    const targetUrl = req.url.slice(1); // Remove a barra inicial '/'

    // 1. Validar se a URL de destino foi fornecida
    if (!targetUrl) {
        res.status(400).send('URL de destino inválida. Deve ser fornecida após a URL do proxy (ex: /https://api.example.com).');
        return;
    }

    // 2. Adicionar os Cabeçalhos CORS na Resposta do Proxy
    // Esses cabeçalhos informam ao navegador que ele pode fazer requisições cross-origin para este proxy.
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite requisições de qualquer origem (ideal para um proxy público)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // Permite os métodos HTTP comuns
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With'); // Permite cabeçalhos comuns

    // 3. Lidar com Requisições OPTIONS (Preflight)
    // Para requisições POST e outras que modificam dados, o navegador envia um OPTIONS primeiro.
    // O proxy precisa responder a essa requisição OPTIONS com sucesso e com os cabeçalhos CORS.
    if (req.method === 'OPTIONS') {
        res.status(200).end(); // Responde com sucesso e encerra a requisição OPTIONS
        return;
    }

    // 4. Preparar as Opções para a Requisição 'fetch' ao Target
    const fetchOptions = {
        method: req.method, // Usa o mesmo método da requisição original (GET, POST, etc.)
        headers: {} // Inicializa o objeto de cabeçalhos
    };

    // 5. Copiar Cabeçalhos da Requisição Original
    // Isso é crucial para que o Content-Type (para POSTs, por exemplo) seja repassado.
    // Você pode filtrar quais cabeçalhos deseja repassar por segurança.
    for (const header in req.headers) {
        // Evitar cabeçalhos que podem causar problemas em proxies (como host)
        if (header.toLowerCase() !== 'host' && header.toLowerCase() !== 'connection') {
            fetchOptions.headers[header] = req.headers[header];
        }
    }

    // 6. Repassar o Corpo da Requisição Original (para POST, PUT, PATCH)
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        // O corpo da requisição de entrada (`req`) é um stream, precisamos lê-lo.
        let requestBody = '';
        for await (const chunk of req) {
            requestBody += chunk.toString();
        }
        if (requestBody) {
            fetchOptions.body = requestBody;
        }
    }

    try {
        // 7. Realizar a Requisição para o Target (a URL real que você quer acessar)
        const response = await fetch(targetUrl, fetchOptions);

        // 8. Copiar os Cabeçalhos da Resposta do Target para a Resposta do Proxy
        // Isso garante que os cabeçalhos importantes da API externa sejam repassados.
        response.headers.forEach((value, name) => {
            // Evitar copiar cabeçalhos que podem causar problemas ou não são relevantes
            if (name.toLowerCase() === 'content-encoding' && value.includes('gzip')) {
                // Evita problemas de descompressão se o Vercel já for comprimir a resposta
                return;
            }
            res.setHeader(name, value);
        });

        // 9. Definir o Status da Resposta do Proxy
        res.status(response.status);

        // 10. Repassar o Corpo da Resposta do Target para o Cliente
        // 'pipe' é eficiente para streams.
        response.body.pipe(res);

    } catch (error) {
        console.error('Erro ao proxyar a requisição:', error);
        res.status(500).send(`Erro interno do proxy: ${error.message}`);
    }
};