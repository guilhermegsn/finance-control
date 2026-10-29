import { supabase } from '../lib/supabase';

const BASE_URL = 'https://sentinela.butterflow.com.br/api/butterflow';

export interface Quote {
  ticker: string;
  name?: string | null;
  price: number | null;
  daily_var: number | null;
  logo_url?: string | null;
  updated_at?: string | null;
}

export type PerformancePeriod = '2D' | '5D' | '1S' | '1M' | '6M' | '1A' | '5A' | 'MAX';

export interface PerformancePoint {
  date: string;
  portfolio: number;
  ibov: number;
  selic: number;
  poupanca: number;
}

export interface PerformanceData {
  period: string;
  start_date: string;
  oldest_asset_date: string;
  series: PerformancePoint[];
}

export class SentinelaAuthError extends Error {
  constructor(message = 'Sessão expirada. Faça login novamente.') {
    super(message);
    this.name = 'SentinelaAuthError';
  }
}

export class SentinelaApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SentinelaApiError';
    this.status = status;
  }
}

class SentinelaService {
  private async getAccessToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new SentinelaAuthError();
    return session.access_token;
  }

  private async request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
    const token = await this.getAccessToken();

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    } catch {
      throw new Error('Não foi possível conectar ao Sentinela. Verifique sua conexão.');
    }

    if (response.status === 401) {
      if (retryOn401) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          return this.request<T>(path, options, false);
        }
      }
      throw new SentinelaAuthError();
    }

    if (!response.ok) {
      let message = `Erro ${response.status} ao comunicar com o Sentinela.`;
      try {
        const body = await response.json();
        if (body?.message || body?.error || body?.detail) {
          message = body.message || body.error || body.detail;
        }
      } catch {
        // corpo não-JSON, mantém a mensagem padrão
      }
      throw new SentinelaApiError(message, response.status);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async getQuotes(tickers: string[]): Promise<Quote[]> {
    if (tickers.length === 0) return [];
    const query = encodeURIComponent(tickers.join(','));
    return this.request<Quote[]>(`/quotes?tickers=${query}`);
  }

  // 404 aqui significa "sem ativos" ou "sem pregão no intervalo" (períodos curtos),
  // nunca erro de rede — o chamador deve tratar como estado vazio
  async getPerformance(period: PerformancePeriod = '6M'): Promise<PerformanceData> {
    return this.request<PerformanceData>(`/performance?period=${period}`);
  }

  async registerDeviceToken(token: string, platform: string): Promise<void> {
    await this.request('/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }
}

export default new SentinelaService();
