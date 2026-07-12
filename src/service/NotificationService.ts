import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import SentinelaService from './SentinelaService';
import CreditCard from '../models/CreditCard';

const SETTINGS_KEY = '@butterflow_notification_settings';

export type NotificationSettings = {
  invoiceDue: {
    enabled: boolean;
    hourOfDay: number;
  };
  engagement: {
    enabled: boolean;
    inactiveDays: number;
  };
};

const DEFAULT_SETTINGS: NotificationSettings = {
  invoiceDue: {
    enabled: true,
    hourOfDay: 9,
  },
  engagement: {
    enabled: true,
    inactiveDays: 7,
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f82c676c-6a73-437b-95c8-d4c3769f8dc6',
      });
      return tokenData.data;
    } catch {
      return null;
    }
  }

  async registerDevice(userId: string): Promise<void> {
    const token = await this.getExpoPushToken();
    if (!token) return;

    await supabase.from('user_devices').upsert(
      {
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  // Registra o Expo push token no backend do Sentinela (alertas de variação de preço).
  // Sem permissão ou em emulador o token vem null e o registro é apenas pulado;
  // falhas de rede/auth não podem travar o fluxo de login.
  async registerSentinelaToken(): Promise<void> {
    const token = await this.getExpoPushToken();
    if (!token) return;

    try {
      await SentinelaService.registerDeviceToken(token, Platform.OS);
    } catch (error) {
      console.log('Falha ao registrar push token no Sentinela:', error);
    }
  }

  async updateLastSeen(userId: string): Promise<void> {
    await supabase
      .from('user_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async unregisterDevice(userId: string): Promise<void> {
    await supabase.from('user_devices').delete().eq('user_id', userId);
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  async scheduleInvoiceNotifications(cards: CreditCard[]): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.invoiceDue.enabled) {
      await this.cancelAllInvoiceNotifications();
      return;
    }

    const granted = await this.requestPermissions();
    if (!granted) return;

    const hour = settings.invoiceDue.hourOfDay;
    const now = new Date();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((n) => n.identifier));

    for (const card of cards) {
      for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
        const year = now.getFullYear();
        const month = now.getMonth() + monthOffset;

        // Date handles month overflow (e.g. month 13 → next year)
        const target = new Date(year, month, card.dueDay, hour, 0, 0, 0);

        if (target.getTime() <= now.getTime()) continue;

        const identifier = `invoice_due_${card.id}_${target.getFullYear()}_${String(target.getMonth() + 1).padStart(2, '0')}`;

        if (scheduledIds.has(identifier)) continue;

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: 'Fatura vencendo hoje 💳',
            body: `A fatura do ${card.name} vence hoje. Não esqueça de pagar!`,
            data: { cardId: card.id, type: 'invoice_due' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: target,
          },
        });
      }
    }
  }

  async cancelCardNotifications(cardId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) => n.identifier.startsWith(`invoice_due_${cardId}_`));
    await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  }

  async scheduleTransactionNotification(
    transactionId: string,
    description: string,
    date: Date,
    type: 'income' | 'expense'
  ): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) return;

    const settings = await this.getSettings();
    const hour = settings.invoiceDue.hourOfDay;

    const target = new Date(date);
    target.setHours(hour, 0, 0, 0);

    // Don't schedule if date is in the past
    if (target.getTime() <= Date.now()) return;

    const identifier = `transaction_due_${transactionId}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: type === 'expense' ? 'Conta a pagar hoje 💸' : 'Recebimento esperado hoje 💰',
        body: description,
        data: { transactionId, type: 'transaction_due' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
      },
    });
  }

  async cancelTransactionNotification(transactionId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(`transaction_due_${transactionId}`);
  }

  async isTransactionNotificationScheduled(transactionId: string): Promise<boolean> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((n) => n.identifier === `transaction_due_${transactionId}`);
  }

  async cancelAllInvoiceNotifications(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) => n.identifier.startsWith('invoice_due_'));
    await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default new NotificationService();
