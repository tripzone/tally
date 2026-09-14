import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function signOutUser() {
    return signOut(auth);
  }

  return { user, loading, signInWithGoogle, signOutUser };
}
