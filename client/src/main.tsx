import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx is executing");

// Add a basic error boundary to catch initialization errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  // If the app fails to render, show a fallback UI
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif;">
        <h2>Something went wrong</h2>
        <p>The application couldn't initialize properly. Please check the console for details.</p>
      </div>
    `;
  }
});

// Function to initialize PWA functionality
const initializePWA = async () => {
  console.log("Service Worker Registration Starting");
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

// Try with a basic initial render
try {
  console.log("About to render React application");
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found in the DOM");
  } else {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("React application rendered successfully");
  }
} catch (error) {
  console.error("Failed to render React application:", error);
}
