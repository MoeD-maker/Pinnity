import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Function to initialize PWA functionality
const initializePWA = async () => {
  try {
    // Dynamically import the service worker registration
    const { register } = await import('./serviceWorkerRegistration');
    
    // Register the service worker for PWA capabilities
    if ('serviceWorker' in navigator) {
      register({
        onSuccess: (registration) => {
          console.log('PWA successfully registered and cached for offline use');
          window.dispatchEvent(new CustomEvent('pwaReady'));
        },
        onUpdate: (registration) => {
          console.log('New version of the app is available');
          window.dispatchEvent(new CustomEvent('pwaUpdate', { 
            detail: { registration } 
          }));
        }
      });
    } else {
      console.log('Service workers are not supported in this browser');
    }
  } catch (error) {
    // If service worker registration fails, the app will still work, just without PWA features
    console.warn('PWA service worker registration failed:', error);
  }
};

// Initialize PWA after the app has loaded
window.addEventListener('load', initializePWA);

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
