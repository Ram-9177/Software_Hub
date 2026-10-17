import webpush from 'web-push';
import { ENV } from './env.js';

let isConfigured = false;

export function initWebPush() {
  if (isConfigured) return;
  try {
    webpush.setVapidDetails(ENV.VAPID_SUBJECT, ENV.VAPID_PUBLIC_KEY, ENV.VAPID_PRIVATE_KEY);
    isConfigured = true;
  } catch (error) {
    console.warn('[WebPush] VAPID details not initialized:', error);
  }
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string }
) {
  initWebPush();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('[WebPush] Send notification error:', error);
    return false;
  }
}
