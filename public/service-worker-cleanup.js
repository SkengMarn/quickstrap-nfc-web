// This script unregisters any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('ServiceWorker unregistered:', registration);
    }
  });
}

// Clear all caches
caches.keys().then(cacheNames => {
  return Promise.all(
    cacheNames.map(cacheName => {
      console.log('Deleting cache:', cacheName);
      return caches.delete(cacheName);
    })
  );
}).then(() => {
  console.log('All caches cleared');
  // Force reload the page
  window.location.reload(true);
});
