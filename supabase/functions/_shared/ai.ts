/**
 * Facade de IA — padrão: Gemini.
 * AI_PROVIDER=openai mantém fallback opcional para OpenAI.
 */
import * as gemini from './gemini.ts';
import * as openai from './openai.ts';

export type AiProvider = 'gemini' | 'openai';

export function getAiProvider(): AiProvider {
  const raw = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase().trim();
  return raw === 'openai' ? 'openai' : 'gemini';
}

export function assertAiConfigured(): void {
  const provider = getAiProvider();
  if (provider === 'gemini') {
    if (!Deno.env.get('GEMINI_API_KEY')) {
      throw new Error('Missing secret: GEMINI_API_KEY');
    }
    return;
  }
  if (!Deno.env.get('OPENAI_API_KEY')) {
    throw new Error('Missing secret: OPENAI_API_KEY');
  }
}

export async function analyzeWineByText(query: string) {
  return getAiProvider() === 'openai'
    ? openai.analyzeWineByText(query)
    : gemini.analyzeWineByText(query);
}

export async function analyzeWineByImage(imageBase64: string) {
  return getAiProvider() === 'openai'
    ? openai.analyzeWineByImage(imageBase64)
    : gemini.analyzeWineByImage(imageBase64);
}

export async function generateDailyTip(context: {
  weatherSummary: string;
  temperatureC: number;
  locationLabel: string;
  cellarWines: string[];
  cellarType?: string;
}) {
  return getAiProvider() === 'openai'
    ? openai.generateDailyTip(context)
    : gemini.generateDailyTip(context);
}

export function aiSourceLabel(): 'gemini' | 'openai' {
  return getAiProvider() === 'openai' ? 'openai' : 'gemini';
}
