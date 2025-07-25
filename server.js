const express = require('express');
const fetch = require('node-fetch'); // use node-fetch@2
const cors = require('cors');

const app = express();

// ✅ CORS Configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ Handle preflight OPTIONS requests

app.use(express.json());

// ─────────────────────────────────────────────────────────────
// FIRST PROXY (Trailer API)
const TRAILER_API_URL = 'https://lineage.api.staging.ndustrial.io/graphql';
const TRAILER_API_TOKEN = 'token niou_T5yfTfEPK9yH6CHvhzLr54KHelGAB39FOCXv';

app.post('/proxy', async (req, res) => {
    await handleProxyRequest(req, res, TRAILER_API_URL, TRAILER_API_TOKEN);
});

// ─────────────────────────────────────────────────────────────
// SECOND PROXY (Submeter API)
const SUBMETER_API_URL = 'https://ndustrialfleet.api.staging.ndustrial.io/graphql';
const SUBMETER_API_TOKEN = 'token niou_jbHb7UeAL8MzSDegQHYn53Bwt7BUrh2eh6zq';

app.post('/proxy-submeter', async (req, res) => {
    await handleProxyRequest(req, res, SUBMETER_API_URL, SUBMETER_API_TOKEN);
});

// ─────────────────────────────────────────────────────────────
// Generic proxy handler for both routes
async function handleProxyRequest(req, res, apiUrl, fallbackToken) {
    try {
        console.log(`Proxying request to ${apiUrl}`);
        console.log('Incoming request body:', req.body);

        const authHeader = req.headers['authorization'] || fallbackToken;

        const upstreamResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(req.body)
        });

        let data;
        try {
            data = await upstreamResponse.json();
        } catch {
            const text = await upstreamResponse.text();
            data = { error: 'Non-JSON response', details: text };
        }

        if (!upstreamResponse.ok) {
            console.error('Upstream error:', data);
            return res.status(upstreamResponse.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Proxy caught error:', error);
        res.status(500).json({ error: error.message || 'Proxy server error' });
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
