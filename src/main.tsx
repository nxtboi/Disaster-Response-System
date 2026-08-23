import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Prevent uncaught runtime promise rejections from crashing the whole app shell
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("Handled unhandledrejection globally:", event.reason);
    // Prevent default browser error overlay if benign
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    console.warn("Handled uncaught error globally:", event.error || event.message);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
