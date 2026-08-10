// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  let data = { title: 'Nova Notificação', body: 'Você tem um novo comunicado na agenda.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nova Notificação', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.png', // Fallback icon
    badge: '/badge.png', // Fallback badge
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Agenda',
      },
      {
        action: 'close',
        title: 'Fechar',
      },
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
