import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<null|object|undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) return null;     // still checking
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
