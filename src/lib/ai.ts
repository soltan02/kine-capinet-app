import { supabase } from './supabase';

// ─── AI patient analysis ─────────────────────────────────────
// Calls the `analyze-patient` edge function, which holds the Gemini
// API key server-side and sends only de-identified clinical data.
// The caller's Supabase session token is attached automatically by invoke().

export type AnalyzeResult = { analysis?: string; error?: string };

// Maps the edge function's error codes to i18n keys the screen can render.
const ERROR_KEYS: Record<string, string> = {
  no_data: 'ai.noData',
  rate_limited: 'ai.rateLimited',
  ai_failed: 'ai.failed',
};

export async function analyzePatient(clientId: string): Promise<AnalyzeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-patient', {
      body: { clientId },
    });

    if (error) {
      // Try to surface the server's structured error code (from the JSON body).
      let code: string | undefined;
      try {
        const ctx = (error as any)?.context;
        const parsed = await ctx?.json?.();
        code = parsed?.error;
      } catch { /* ignore */ }
      return { error: (code && ERROR_KEYS[code]) || 'ai.failed' };
    }

    if (data?.analysis) return { analysis: data.analysis };
    if (data?.error) return { error: ERROR_KEYS[data.error] || 'ai.failed' };
    return { error: 'ai.failed' };
  } catch {
    return { error: 'ai.failed' };
  }
}
