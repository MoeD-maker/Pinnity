import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { register, checkForUpdates } from './serviceWorkerRegistration';

// Register the service worker for PWA functionality with callbacks
register({
  onSuccess: (registration) => {
    console.log('PWA has been installed and cached for offline use.');
    // You can show a toast notification here that the app is ready for offline use
  },
  onUpdate: (registration) => {
    console.log('New version of the app is available!');
    // You can show a toast notification here that a new version is available
  }
});

// Check for service worker updates
checkForUpdates(() => {
  console.log('New app version is waiting to be applied');
  // You can show a UI element (like a banner) to let users refresh to get the new version
});

// Get PWA install event
window.addEventListener('beforeinstallprompt', (event) => {
  // Prevent the default browser install prompt
  event.preventDefault();
  
  // Save the event to use it later when the user clicks on a custom "Install" button
  // @ts-ignore
  window.deferredPrompt = event;
  
  // Show your custom install button or UI
  console.log('App can be installed on this device');
});

// Handle install completion
window.addEventListener('appinstalled', () => {
  console.log('Application was successfully installed');
  // Clear the deferredPrompt
  // @ts-ignore
  window.deferredPrompt = null;
});

createRoot(document.getElementById("root")!).render(<App />);
