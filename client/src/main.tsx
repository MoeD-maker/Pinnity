import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { register } from './serviceWorkerRegistration';

// Register the service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    register({
      onSuccess: (registration) => {
        console.log('PWA has been installed and cached for offline use.');
      },
      onUpdate: (registration) => {
        console.log('New version of the app is available!');
      }
    });
  });
}

// Set up online/offline event handling
window.addEventListener('online', () => {
  console.log('App is back online');
  window.dispatchEvent(new CustomEvent('offlineStatusChanged', { 
    detail: { isOffline: false } 
  }));
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  window.dispatchEvent(new CustomEvent('offlineStatusChanged', { 
    detail: { isOffline: true } 
  }));
});

// Render the React application
createRoot(document.getElementById("root")!).render(<App />);
