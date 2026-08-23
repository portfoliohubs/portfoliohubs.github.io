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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadBatchResilient } from '../lib/storageHelper';
import CONFIG from '../config';

export default function Login() {
  const [, setLocation] = useLocation();
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
      if (user.email) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          isAdmin = adminDoc.exists();
        } catch (e) {
          isAdmin = false;
        }
      }

      if (isAdmin) {
        setLocation('/admin');
        return;
      }

      if (isSignUp) {
        const draftStr = localStorage.getItem('portfolio_draft');
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          
          // Prepare parallel upload batch for profile and cases
          const uploadItems: Array<{ key: string; dataUrl: string; path: string }> = [];
          if (draft.profilePhoto && draft.profilePhoto.startsWith('data:image')) {
            uploadItems.push({
              key: 'profile',
              dataUrl: draft.profilePhoto,
              path: `profile_${Date.now()}.jpg`
            });
          }

          if (draft.cases && Array.isArray(draft.cases)) {
            draft.cases.forEach((c: any, i: number) => {
              if (c.photo && c.photo.startsWith('data:image')) {
                uploadItems.push({
                  key: `case_${i}`,
                  dataUrl: c.photo,
                  path: `cases/${Date.now()}_${i}.jpg`
                });
              }
            });
          }

          const uploadResults = await uploadBatchResilient(user.uid, uploadItems);

          if (uploadResults['profile']) {
            draft.profilePhoto = uploadResults['profile'];
            draft.profilePreview = uploadResults['profile'];
          }

          if (draft.cases && Array.isArray(draft.cases)) {
            draft.cases = draft.cases.map((c: any, i: number) => {
              const photoUrl = uploadResults[`case_${i}`] || c.photo;
              return {
                ...c,
                photo: photoUrl,
                preview: photoUrl
              };
            });
          }

          let caseLimit = 3;
          if (draft.packageTier) {
            const pkgDoc = await getDoc(doc(db, 'packages', draft.packageTier));
            if (pkgDoc.exists()) {
              caseLimit = pkgDoc.data().caseLimit ?? 3;
            }
          }

          await setDoc(doc(db, 'portfolios', user.uid), {
            ...draft,
            status: 'pending_review',
            caseLimit: caseLimit,
            active: true,
            hasUnreviewedChanges: false,
            paymentConfirmed: false
          });

          localStorage.removeItem('portfolio_draft');

          const phone = CONFIG.social.whatsapp.replace(/[^0-9]/g, '');
          const msg = encodeURIComponent(`Hi, I have just completed my portfolio registration and selected the ${draft.packageTier || 'Free'} package. I'd like to arrange payment.`);
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        }
      }

      setLocation('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Error during post-auth setup');
    }
  };


  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handlePostAuth(result.user, mode === 'signup');
    } catch (e: any) {
      setError(e.message || 'Failed to authenticate with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
        if (name) {
          await updateProfile(user, { displayName: name });
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
      await handlePostAuth(user, mode === 'signup');
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
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
          {mode === 'signup' ? 'Complete your portfolio registration.' : 'Welcome back, doctor.'}
        </p>

        {error && <div className="p-3 mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <input required className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
            </div>
          )}
          <div>
            <input required type="email" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </div>
          <div>
            <input required type="password" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
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
