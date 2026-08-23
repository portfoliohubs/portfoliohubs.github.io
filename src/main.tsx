import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (e) => {
  console.error('PortfolioHubs Uncaught Window Error:', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('PortfolioHubs Unhandled Promise Rejection:', e.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

