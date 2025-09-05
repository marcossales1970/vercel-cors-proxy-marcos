// api/proxy.js
import fetch from 'node-fetch'; // Garante que o node-fetch esteja importado

export default async function (req, res) {
  // --- Configuração dos Cabeçalhos CORS (Aplicado a TODAS as respostas) ---
  // A origem permitida para acessar este proxy. Mantido o seu domínio Vercel.
  const allowedOrigin = 'https://v0-brazilian-portuguese-prompts.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

  // Métodos HTTP permitidos. Incluí os mais comuns (GET, POST, PUT, DELETE) e OPTIONS para preflight.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Cabeçalhos que o cliente pode enviar. Expandi para incluir headers comuns como Authorization.
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Tempo máximo (em segundos) que a resposta de preflight pode ser armazenada em cache pelo navegador.
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas

  // --- Tratamento de Requisições de Pré-Voo (Preflight - Método OPTIONS) ---
  // Se a requisição é OPTIONS, o navegador está apenas verificando as permissões CORS.
  // Respondemos com 204 (No Content) indicando sucesso sem corpo de resposta.
  if (req.method === 'OPTIONS') {
    console.log('Requisição OPTIONS (Preflight) recebida.');
    return res.status(204).end();
  }

  // --- Extração da URL de Destino ---
  // A URL de destino agora DEVE ser passada como um parâmetro de query chamado 'url'.
  // Exemplo de como usar: SEU_PROXY.vercel.app/api/proxy?url=https://api.seuservico.com/dados
  const targetUrl = req.query.url;

  // Logs para depuração (pode remover depois que tudo funcionar)
  console.log('Original req.url (Vercel path):', req.url);
  console.log('URL de destino extraída do query parameter:', targetUrl);

  // --- Validação da URL de Destino ---
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    console.error('URL de destino inválida ou ausente:', targetUrl);
    return res.status(400).send('URL de destino inválida. Deve começar com http:// ou https:// e ser passada como parâmetro "url" na URL do proxy.');
  }

  try {
    // --- Filtragem de Cabeçalhos da Requisição Original ---
    // Remove cabeçalhos que podem causar problemas ou são irrelevantes para a requisição proxy.
    const filteredHeaders = {};
    for (const key in req.headers) {
      if (!['host', 'connection', 'content-length', 'content-encoding', 'x-forwarded-for'].includes(key.toLowerCase())) {
        filteredHeaders[key] = req.headers[key];
      }
    }

    // --- Preparação do Corpo da Requisição (para POST/PUT/PATCH) ---
    let requestBody = undefined;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      // Se o corpo da requisição já for um objeto (comum para JSONs que o Vercel auto-parseia),
      // ele é stringificado para ser enviado pelo 'fetch'.
      if (typeof req.body === 'object' && req.body !== null) {
        requestBody = JSON.stringify(req.body);
        // Garante que o Content-Type esteja definido como 'application/json' se estivermos enviando JSON
        filteredHeaders['Content-Type'] = filteredHeaders['Content-Type'] || 'application/json';
      } else {
        // Caso contrário, assume que o corpo já está no formato correto (string, buffer, etc.)
        requestBody = req.body;
      }
    }

    // --- Realiza a Requisição Proxy para a URL de Destino ---
    const response = await fetch(targetUrl, {
      method: req.method, // Usa o mesmo método da requisição original
      headers: filteredHeaders, // Usa os cabeçalhos filtrados
      body: requestBody, // Envia o corpo processado
      redirect: 'follow', // Opcional: Segue redirecionamentos da URL de destino
    });

    // --- Copia os Cabeçalhos da Resposta do Servidor de Destino para o Cliente ---
    response.headers.forEach((value, name) => {
      // Evita copiar cabeçalhos CORS ou outros que são manipulados pelo Vercel ou podem gerar conflito.
      if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'content-encoding', 'transfer-encoding'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // --- Envia a Resposta Final para o Cliente ---
    // Usa 'response.buffer()' para lidar tanto com texto quanto com dados binários de forma versátil.
    res.status(response.status).send(await response.buffer());

  } catch (error) {
    console.error('Erro no Proxy:', error);
    res.status(500).send(`Erro interno do Proxy. Verifique os logs do Vercel. Detalhe: ${error.message}`);
  }
}