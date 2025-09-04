// api/index.js
const corsAnywhere = require('cors-anywhere'); // Importa a biblioteca cors-anywhere

// ADICIONE ESTAS DUAS LINHAS LOGO ABAIXO DA LINHA DO "require":
console.log('Type of corsAnywhere:', typeof corsAnywhere);
console.log('corsAnywhere object/value:', corsAnywhere);

// Cria o middleware do cors-anywhere com as opções desejadas
const proxy = corsAnywhere({ // Esta é a linha 6 onde o erro ocorre
    originWhitelist: [], // Permitir todas as origens para teste
    // Para produção, considere adicionar sua origem específica para segurança:
    // originWhitelist: ['https://v0-brazilian-portuguese-prompts.vercel.app'],
    requireHeaders: ['origin', 'x-requested-with'], // Requer um desses cabeçalhos
    removeHeaders: ['cookie', 'cookie2'], // Remove cabeçalhos de cookie por segurança
    redirectSameOrigin: true, // Opcional
    httpProxyOptions: {
        xfwd: true, // Adiciona cabeçalhos X-Forwarded-For, etc.
    },
});

// Este é o ponto de entrada da função Serverless da Vercel
module.exports = (req, res) => {
    // Invoca o middleware do cors-anywhere diretamente com a requisição e resposta
    proxy(req, res);
};
