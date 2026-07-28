/*
 * Drapé Collective — Service Worker (push handler + cache management)
 *
 * Registered via src/lib/pwa.ts which imports this file as raw text,
 * creates a Blob URL, and calls navigator.serviceWorker.register().
 *
 * This file must be plain JavaScript — not TypeScript — because it
 * executes directly in the browser's ServiceWorker context.
 */

/* eslint-env serviceworker */
/* global self, clients, caches */

/* ───── Cache Configuration ───── */

var CACHE_NAME = 'drape-v1';
var STATIC_ASSETS = [
  '/',
  '/index.html',
];

/* ───── Install — cache the app shell ───── */

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* ───── Activate — clean old caches ───── */

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      return clients.claim();
    })
  );
});

/* ───── Fetch — network-first for HTML, cache-first for assets ───── */

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  // Skip non-HTTP(S) and cross-origin requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // Skip WebSocket / EventSource connections
  if (request.headers.get('Upgrade') || request.headers.get('Accept') === 'text/event-stream') return;

  var pathname = url.pathname;

  // For navigation requests (HTML pages) — network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Cache the fresh page response
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            if (cached) return cached;
            // Absolute fallback: serve index.html for SPA deep links
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For version.json — always go to network (no-cache) so update checking works
  if (pathname === '/version.json') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(function () {
          return new Response(JSON.stringify({ hash: '' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) — cache-first
  event.respondWith(
    caches.match(request).then(function (cached) {
      var fetchPromise = fetch(request).then(function (response) {
        // Update the cache in the background
        if (response.ok) {
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, cloned);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});

/* ───── Push Notifications ───── */

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  var title = data.title || 'Drapé Collective';
  var body = data.body || '';
  var conversationId = data.conversationId || '';
  var senderName = data.senderName || '';
  var tag = conversationId
    ? 'drape-message-' + conversationId
    : 'drape-message';

  var iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="35" fill="#1A1410"/><text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-family="\'Playfair Display\',\'Times New Roman\',serif" font-size="120" font-weight="700" fill="#C9A96E" letter-spacing="-2">D\u00e9</text></svg>';
  var iconDataUri = 'data:image/svg+xml,' + encodeURIComponent(iconSvg);

  var notificationOptions = {
    body: body,
    icon: iconDataUri,
    badge: iconDataUri,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      conversationId: conversationId,
      url: conversationId
        ? '/messages?conversation=' + conversationId
        : '/messages',
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener('notificationclick', function (event) {
  var notification = event.notification;
  var action = event.action;
  var data = notification.data || {};

  notification.close();

  if (action === 'reply') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
        function (clientList) {
          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if (client.url.indexOf('/messages') !== -1 && typeof client.focus === 'function') {
              return client.focus();
            }
          }
          return clients.openWindow('/messages');
        },
      ),
    );
    return;
  }

  var targetUrl = data.url || '/messages';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf('/messages') !== -1 && typeof client.focus === 'function') {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      },
    ),
  );
});
});
