import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/theme-provider';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="cms-theme">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);
