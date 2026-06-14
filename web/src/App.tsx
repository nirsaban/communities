import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { ToastHost } from './components/Toast';
import { AppRoutes } from './router/routes';

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <AppRoutes />
      <ToastHost />
    </ErrorBoundary>
  );
}
