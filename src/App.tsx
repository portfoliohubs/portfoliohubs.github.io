import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { ThemeProvider } from './components/ThemeProvider';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import WebsiteWizard from './pages/WebsiteWizard';
import CVWizard from './pages/CVWizard';
import DsdStudio from './pages/DsdStudio';
import MotionStudio from './pages/MotionStudio';
import PublicBlog from './pages/PublicBlog';
import PublicArticle from './pages/PublicArticle';
import DocumentationCenter from './pages/DocumentationCenter';
import PublicWebsite from './pages/PublicWebsite';
import PlatformPage from './pages/PlatformPage';
import ContextAwareChatbot from './components/ContextAwareChatbot';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* Hash-based router: critical for GitHub Pages static hosting to prevent 404 on refresh */}
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={Login} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/website" component={WebsiteWizard} />
          <Route path="/portfolio" component={WebsiteWizard} />
          <Route path="/cv" component={CVWizard} />
          <Route path="/dsd" component={DsdStudio} />
          <Route path="/motiongraphic" component={MotionStudio} />
          <Route path="/blog" component={PublicBlog} />
          <Route path="/blog/:slug" component={PublicArticle} />
          <Route path="/docs" component={DocumentationCenter} />
          <Route path="/docs/:slug" component={DocumentationCenter} />
          <Route path="/about"><PlatformPage kind="about" /></Route>
          <Route path="/pricing"><PlatformPage kind="pricing" /></Route>
          <Route path="/contact"><PlatformPage kind="contact" /></Route>
          <Route path="/privacy"><PlatformPage kind="privacy" /></Route>
          <Route path="/terms"><PlatformPage kind="terms" /></Route>
          <Route path="/changelog"><PlatformPage kind="changelog" /></Route>
          <Route path="/status"><PlatformPage kind="status" /></Route>
          <Route path="/dr:slug" component={PublicWebsite} />
          <Route path="/dr/:slug" component={PublicWebsite} />
          {/* Fallback route */}
          <Route component={HomePage} />
        </Switch>
      </Router>

      {/* Context-Aware Chatbot */}
      <ContextAwareChatbot />
    </ThemeProvider>
  );
}
