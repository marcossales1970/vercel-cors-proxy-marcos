// api/index.js
const corsAnywhere = require('cors-anywhere'); // Importa a biblioteca cors-anywhere

// Cria o middleware do cors-anywhere com as opções desejadas
const proxy = corsAnywhere({ // CORREÇÃO: era corsAnywhere.createMiddleware
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
