import React from 'react';
import { GenericErrorScreen } from '../features/edge/GenericErrorScreen';

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Eslint console allowed for dev visibility; production would forward to Sentry.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <GenericErrorScreen
          message={this.state.error?.message ?? 'An unexpected error happened.'}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
