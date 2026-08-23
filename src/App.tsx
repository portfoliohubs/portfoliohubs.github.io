import { Component, ReactNode } from 'react';
import { Switch, Route, Router as WouterRouter } from 'wouter';
import { useFavicon } from './hooks/useFavicon';
import config from './config';
import { ThemeProvider } from 'next-themes';
import HomePage from './pages/HomePage';
import PortfolioWizard from './pages/PortfolioWizard';
import CVWizard from './pages/CVWizard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('PortfolioHubs App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
          <div className="max-w-md p-6 rounded-2xl border border-border bg-card shadow-lg">
            <h1 className="text-xl font-bold mb-2 text-primary">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/"          component={HomePage} />
      <Route path="/portfolio" component={PortfolioWizard} />
      <Route path="/cv"        component={CVWizard} />
      <Route path="/login"     component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin"     component={AdminDashboard} />
      <Route>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground text-sm">Page not found</p>
          <a href="/" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
            Go to Homepage
          </a>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  useFavicon(config.brand.favicon);
  const rawBase = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env.BASE_URL : '/';
  const routerBase = rawBase && rawBase !== '/' ? rawBase.replace(/\/$/, '') : undefined;

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {routerBase ? (
          <WouterRouter base={routerBase}>
            <AppRoutes />
          </WouterRouter>
        ) : (
          <WouterRouter>
            <AppRoutes />
          </WouterRouter>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

