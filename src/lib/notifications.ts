// Utility for Browser Push Notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso:', registration);
      return registration;
    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error);
      return null;
    }
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.error('Este navegador não suporta notificações.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const subscribeUserToPush = async (registration: ServiceWorkerRegistration, publicVapidKey: string) => {
  if (!registration.pushManager) {
    console.warn('pushManager não disponível neste navegador.');
    return null;
  }
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    console.log('Usuário inscrito com sucesso:', subscription);
    return subscription;
  } catch (error) {
    console.error('Falha ao inscrever usuário:', error);
    return null;
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
