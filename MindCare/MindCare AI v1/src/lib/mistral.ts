import { Mistral } from '@mistralai/mistralai';

let client: Mistral | null = null;

export function getMistralClient(): Mistral {
  if (!client) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not configured. Add it to .env.local');
    }
    client = new Mistral({ apiKey });
  }
  return client;
}

export async function mistralChat(options: {
  model?: string;
  system?: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const client = getMistralClient();
  const model = options.model || 'mistral-large-latest';
  
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: options.userMessage });

  const response = await client.chat.complete({
    model,
    messages,
    maxTokens: options.maxTokens,
  });

  const text = response.choices?.[0]?.message?.content || '';
  return { text: typeof text === 'string' ? text : '', model: response.model || model };
}
