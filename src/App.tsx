import { Switch, Route, Router as WouterRouter } from 'wouter';
import { useFavicon } from './hooks/useFavicon';
import config from './config';
import { ThemeProvider } from 'next-themes';
import HomePage from './pages/HomePage';
import PortfolioWizard from './pages/PortfolioWizard';
import CVWizard from './pages/CVWizard';

/**
 * Path-based routing using BASE_URL:
 * - Replit dev:    BASE_URL = "/"      → base = ""   → routes /  /portfolio  /cv
 * - GitHub Pages:  BASE_URL = "/MICKY/" → base = "/MICKY" → strips prefix from URL
 *
 * On GitHub Pages the build plugin writes 404.html = index.html so that
 * direct navigation to /MICKY/portfolio is served by the SPA correctly.
 */
function AppRoutes() {
  return (
    <Switch>
      <Route path="/"          component={HomePage} />
      <Route path="/portfolio" component={PortfolioWizard} />
      <Route path="/cv"        component={CVWizard} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  useFavicon(config.brand.favicon);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') ?? ''}>
        <AppRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}
