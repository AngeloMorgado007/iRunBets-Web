importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD8uluVvvdKsDDk4hbr6eQeavJHv66n5TE",
  authDomain: "irunbets.firebaseapp.com",
  projectId: "irunbets",
  storageBucket: "irunbets.firebasestorage.app",
  messagingSenderId: "441556391081",
  appId: "1:441556391081:web:d691bee0fb1e3d118505b8"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background Push Message received: ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || '🚨 iRunBets Prognóstico';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'Novo prognóstico com odd de valor disponível!',
    icon: payload.notification?.icon || '/irunbets_logo.png',
    badge: '/irunbets_logo.png',
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Ver Prognóstico' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.click_action || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
