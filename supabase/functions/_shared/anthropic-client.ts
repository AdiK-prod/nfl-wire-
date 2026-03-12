const ANTHROPIC_API_KEY = Deno.env.get('NFLWIRE_ANTHROPIC_API_KEY');

if (!ANTHROPIC_API_KEY) {
  console.warn('[anthropic-client] NFLWIRE_ANTHROPIC_API_KEY is not set; AI relevance checks will fail.');
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaudeJSON<T>(messages: ClaudeMessage[], model = 'claude-3-haiku-20240307', maxTokens = 300): Promise<T> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('NFLWIRE_ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const raw = (data?.content?.[0]?.text ?? '').trim();

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Claude returned non-JSON response for JSON-only prompt');
  }
}

