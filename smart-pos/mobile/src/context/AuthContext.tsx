import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, listenToPairedCamera } from '../services/firebase';

type AuthContextType = {
  user: User | null;
  pairedCameraId: string | null;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  pairedCameraId: null,
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pairedCameraId, setPairedCameraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setPairedCameraId(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Listen for the paired camera ID for this user
    const unsubscribe = listenToPairedCamera((cameraId) => {
      setPairedCameraId(cameraId);
      setLoading(false); // Finished loading once we have the camera ID (or null)
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const logout = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, pairedCameraId, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
