import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { AppRoutes } from './router/routes';

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <AppRoutes />
    </ErrorBoundary>
  );
}
