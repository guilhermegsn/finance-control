import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import NotificationService from '../service/NotificationService';
import CreditCardService from '../service/CreditCardService';

export function useNotifications(userId: string | undefined) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Bootstrap: register device and schedule notifications
    (async () => {
      await NotificationService.registerDevice(userId);
      const cards = await CreditCardService.getAll(userId);
      await NotificationService.scheduleInvoiceNotifications(cards);
    })();

    // Listen to notification received while app is open (optional: handle in-app display)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Future: in-app banner or badge update
    });

    // Listen to user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // Future: deep-link to the relevant credit card
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  // Reschedule on foreground and update last_seen_at
  useEffect(() => {
    if (!userId) return;

    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        await NotificationService.updateLastSeen(userId);
        const cards = await CreditCardService.getAll(userId);
        await NotificationService.scheduleInvoiceNotifications(cards);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [userId]);
}
