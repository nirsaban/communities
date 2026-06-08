import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Side-effect import: applies persisted locale (html lang + dir) before paint.
import './i18n';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Theme bootstrap from system preference (Flutter uses ThemeMode.system).
const mql = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = (): void => {
  document.documentElement.classList.toggle('dark', mql.matches);
};
applyTheme();
mql.addEventListener('change', applyTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
