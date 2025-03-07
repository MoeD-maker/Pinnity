import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { register } from './serviceWorkerRegistration';

// Register the service worker for PWA functionality
register();

createRoot(document.getElementById("root")!).render(<App />);
