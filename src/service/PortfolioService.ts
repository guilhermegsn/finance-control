import { database } from '../database';
import Portfolio from '../models/Portfolio';
import { Q } from '@nozbe/watermelondb';

export type PortfolioInput = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  userId: string;
  purchasedAt?: number;
};

class PortfolioService {
  getCollection() {
    return database.get<Portfolio>('portfolios');
  }

  getAll(userId: string) {
    return this.getCollection().query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    ).fetch();
  }

  observeAll(userId: string) {
    return this.getCollection().query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null),
      Q.sortBy('ticker', Q.asc)
    ).observe();
  }

  async findByTicker(userId: string, ticker: string): Promise<Portfolio | null> {
    const results = await this.getCollection().query(
      Q.where('user_id', userId),
      Q.where('ticker', ticker.toUpperCase()),
      Q.where('deleted_at', null)
    ).fetch();
    return results[0] ?? null;
  }

  async create(data: PortfolioInput): Promise<Portfolio> {
    this.validate(data);

    const existing = await this.findByTicker(data.userId, data.ticker);
    if (existing) {
      throw new Error('Este ativo já está na sua carteira');
    }

    return await database.write(async () => {
      return await this.getCollection().create((asset) => {
        asset.userId = data.userId;
        asset.ticker = data.ticker.toUpperCase();
        asset.quantity = data.quantity;
        asset.averagePrice = data.averagePrice;
        asset.purchasedAt = data.purchasedAt ?? Date.now();
      });
    });
  }

  async update(asset: Portfolio, data: Partial<PortfolioInput>): Promise<Portfolio> {
    this.validate({ ...asset, ...data } as PortfolioInput);
    return await database.write(async () => {
      return await asset.update((a) => {
        if (data.quantity !== undefined) a.quantity = data.quantity;
        if (data.averagePrice !== undefined) a.averagePrice = data.averagePrice;
        if (data.purchasedAt !== undefined) a.purchasedAt = data.purchasedAt;
      });
    });
  }

  async delete(asset: Portfolio): Promise<void> {
    await database.write(async () => {
      await asset.update((a) => {
        a.deletedAt = Date.now();
      });
    });
  }

  private validate(data: PortfolioInput) {
    if (!data.ticker?.trim()) {
      throw new Error('Ticker é obrigatório');
    }
    if (!(data.quantity > 0)) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    if (!(data.averagePrice > 0)) {
      throw new Error('Preço médio deve ser maior que zero');
    }
  }
}

export default new PortfolioService();
