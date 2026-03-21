import { database } from '../database';
import CreditCard from '../models/CreditCard';
import { Q } from '@nozbe/watermelondb';

export type CreditCardInput = {
  name: string;
  brand: string;
  closingDay: number;
  dueDay: number;
  limit: number;
  color: string;
  userId: string;
};

class CreditCardService {
  getCollection() {
    return database.get<CreditCard>('credit_cards');
  }

  getAll(userId: string) {
    return this.getCollection().query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    ).fetch();
  }

  async create(data: CreditCardInput): Promise<CreditCard> {
    this.validate(data);
    return await database.write(async () => {
      return await this.getCollection().create((card) => {
        card.name = data.name;
        card.brand = data.brand;
        card.closingDay = data.closingDay;
        card.dueDay = data.dueDay;
        card.limit = data.limit;
        card.color = data.color;
        card.userId = data.userId;
      });
    });
  }

  async update(card: CreditCard, data: Partial<CreditCardInput>): Promise<CreditCard> {
    this.validate({ ...card, ...data } as CreditCardInput);
    return await database.write(async () => {
      return await card.update((c) => {
        if (data.name) c.name = data.name;
        if (data.brand) c.brand = data.brand;
        if (data.closingDay) c.closingDay = data.closingDay;
        if (data.dueDay) c.dueDay = data.dueDay;
        if (data.limit !== undefined) c.limit = data.limit;
        if (data.color) c.color = data.color;
      });
    });
  }

  async delete(card: CreditCard): Promise<void> {
    await database.write(async () => {
      await card.update((c) => {
        c.deletedAt = Date.now();
      });
    });
  }

  private validate(data: CreditCardInput) {
    if (data.closingDay < 1 || data.closingDay > 31) {
      throw new Error('Closing day must be between 1 and 31');
    }
    if (data.dueDay < 1 || data.dueDay > 31) {
      throw new Error('Due day must be between 1 and 31');
    }
    if (data.limit <= 0) {
      throw new Error('Limit must be greater than zero');
    }
  }
}

export default new CreditCardService();