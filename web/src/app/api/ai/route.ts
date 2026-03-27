import { NextResponse } from 'next/server';

type Message = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, price, pattern, user_level, apiKey, provider, messages = [], userMessage } = body;
    const cleanApiKey = apiKey ? apiKey.trim() : '';

    if (!cleanApiKey) {
      return NextResponse.json({ error: 'API Key required.' }, { status: 400 });
    }

    const systemContext = user_level === 'Beginner'
      ? `You are NIVESHAI, a friendly AI trading assistant for Indian retail investors. 
         You are analyzing ${symbol} trading at ₹${price}${pattern ? `, which shows a "${pattern}" chart pattern` : ''}.
         Use simple, jargon-free language. Be concise, warm, and helpful. Format your responses clearly.
         Always relate to Indian market context (NSE, Nifty, Sensex, SEBI). Keep responses to 2-4 paragraphs max.`
      : `You are NIVESHAI, a professional quantitative trading AI for advanced Indian investors.
         You are analyzing ${symbol} at ₹${price}${pattern ? ` with a detected "${pattern}" chart pattern` : ''}.
         Use precise financial terminology, quantitative metrics, and institutional-level analysis.
         Reference NSE-specific data, LightGBM signal composites, PIP/Directional Change algorithms.
         Be concise and actionable. Max 3-4 paragraphs.`;

    const newUserMsg = userMessage || `Explain the current chart setup for ${symbol}.`;
    let responseText = '';

    if (provider.startsWith('gemini')) {
      let modelName = 'gemini-1.5-flash';
      if (provider === 'gemini-2.0') modelName = 'gemini-2.0-flash';
      if (provider === 'gemini-3') modelName = 'gemini-3-flash-preview';

      const contents: any[] = [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to assist with technical analysis.' }] },
      ];

      for (const msg of messages as Message[]) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }

      contents.push({ role: 'user', parts: [{ text: newUserMsg }] });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanApiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API Error: ${res.status} ${res.statusText} - ${errText}`);
      }
      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    } else {
      const openAiMessages: any[] = [{ role: 'system', content: systemContext }];
      for (const msg of messages as Message[]) {
        openAiMessages.push({ role: msg.role, content: msg.content });
      }
      openAiMessages.push({ role: 'user', content: newUserMsg });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cleanApiKey}` },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: openAiMessages })
      });

      if (!res.ok) throw new Error(`OpenAI Error: ${res.status}`);
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || 'No response generated.';
    }

    return NextResponse.json({ explanation: responseText });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate AI insight.' }, { status: 500 });
  }
}
