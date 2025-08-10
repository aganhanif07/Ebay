const express = require('express');
const axios = require('axios'); // <-- WAJIB ditambahkan
const app = express();
const PORT = 3000;


/** Call OpenAI Responses API (gpt-4.1) */
async function callOpenAIResponses(prompt, model = 'gpt-4.1') {
  const r = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model,
      input: prompt,
      temperature: 0
    },
    {
      headers: {
        Authorization: `Bearer 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`,
        'Content-Type': 'application/json'
      },
      timeout: 60_000
    }
  );
  return r.data; // RAW responses payload
}

/** Ambil text dari output -> message -> content -> output_text.text  */
function extractOutputText(data) {
  if (!data || !Array.isArray(data.output)) return null;
  for (const item of data.output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      const ot = item.content.find(c => c?.type === 'output_text' && typeof c.text === 'string');
      if (ot) return ot.text;
    }
  }
  return null; // ga ada output_text
}

// GET /ebay/scrap?url=...&model=gpt-4.1&raw=true
app.get('/ebay/scrap', async (req, res) => {
  const url   = req.query.url   || 'https://www.ebay.com/sch/i.html?_from=R40&_nkw=nike&_sacat=0&rt=nc&_pgn=1';
  const model = req.query.model || 'gpt-4.1';
  const wantRaw = String(req.query.raw || '').toLowerCase() === 'true';

  // prompt sesuai requirement test
  const prompt = `
${url}

- Results must be returned in JSON format.
- Extract at least: product name, product price, product description.
- You can visit each product's detail page and retrieve the description provided by the seller inside the nested product detail page.
- Scrape all products across pagination.
- If any field (e.g., product price or description) does not have a value, return '-'.
`.trim();

  try {
    const raw = await callOpenAIResponses(prompt, model);

    if (wantRaw) return res.json(raw); // paksa kirim full payload

    const text = extractOutputText(raw);
    // sesuai permintaan: kalau ada text -> kirim text saja; kalau tidak -> kirim full response
    if (typeof text === 'string') return res.send(text);
    return res.json(raw);
  } catch (e) {
    console.error('OpenAI error:', e?.response?.data || e.message);
    return res.status(500).json({
      url,
      error: 'failed to get response from OpenAI'
    });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
