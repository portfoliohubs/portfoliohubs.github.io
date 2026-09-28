import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import CONFIG from '../config';

export default function Login() {
  const [, setLocation] = useLocation();
  const service = new URLSearchParams(window.location.search).get('service') || 'website';
  const [mode, setMode] = useState<'signin' | 'signup'>(
    new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'signin'
  );
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePostAuth = async (user: any, isSignUp: boolean) => {
    try {
      let isAdmin = false;
      if (user.email && user.emailVerified) {
        isAdmin =
          user.email === 'cources01@gmail.com' ||
          user.email === 'admin@portfoliohubs.com' ||
          user.email === 'portfoliohubs.contact@gmail.com'
      }

      if (isAdmin) {
        setLocation('/admin');
        return;
      }

      if (isSignUp) {
        const draftStr = sessionStorage.getItem('portfolio_draft');
        if (draftStr) {
          const draft = JSON.parse(draftStr);

          // Save user profile directly to Firestore
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            ...draft,
            uid: user.uid,
            email: user.email || draft.email || '',
            updatedAt: serverTimestamp(),
          }, { merge: true });

          sessionStorage.removeItem('portfolio_draft');
        }
      }

      setLocation(service === 'website' ? '/website' : `/${service}`);
    } catch (e: any) {
      setError(e.message || 'Error during post-auth setup');
    }
  };


  const formatAuthError = (e: any) => {
    const code = e?.code || '';
    const msg = e?.message || '';
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';

    if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
      return `Domain authorization required: "${currentHost}" is not yet added to your Firebase Authorized Domains. In Firebase Console -> Authentication -> Settings -> Authorized domains, click "Add domain" and enter "${currentHost}".`;
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'The sign-in popup was closed before completing authentication. Please try again.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Popup was blocked by your browser. Please allow popups for this site or use email & password.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Invalid email address or password. Please verify and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account already exists with this email address. Please switch to Sign In.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    return msg || 'Authentication failed. Please check your credentials.';
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handlePostAuth(result.user, mode === 'signup');
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      let user;
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        user = userCredential.user;
        if (name) {
          await updateProfile(user, { displayName: name });
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        user = userCredential.user;
      }
      await handlePostAuth(user, mode === 'signup');
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-card p-6 rounded-2xl border border-border w-full max-w-sm shadow-xl">
        <h1 className="text-2xl font-extrabold mb-2 text-foreground">
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === 'signup'
            ? `Complete your ${service === 'website' ? 'website' : service} registration.`
            : `Welcome back to your ${service} workspace.`}
        </p>

        {error && <div className="p-3 mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4" dir="ltr">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-left">Full Name</label>
              <input required dir="ltr" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm text-left focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Dr. Full Name" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 text-left">Email Address</label>
            <input required dir="ltr" type="email" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm text-left focus:ring-2 focus:ring-primary focus:outline-none" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 text-left">Password</label>
            <input required dir="ltr" type="password" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm text-left focus:ring-2 focus:ring-primary focus:outline-none" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-70">
            {loading ? 'Please wait...' : (mode === 'signup' ? 'Sign Up & Save' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Or</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <button onClick={handleGoogle} disabled={loading} className="w-full border border-border py-3 rounded-xl mt-6 font-semibold hover:bg-muted transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} disabled={loading} className="text-sm mt-6 text-center w-full text-muted-foreground hover:text-foreground transition-colors font-medium">
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
