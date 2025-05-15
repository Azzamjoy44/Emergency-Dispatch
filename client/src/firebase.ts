// client/src/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:       'AIzaSyBXqrs4N8HRKSwzO17-XAageqvmvLguofk',
  authDomain:   'emergency-dispatching-center.firebaseapp.com',
  projectId:    'emergency-dispatching-center',
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence)
  .catch(err =>
    console.error('Failed to set session persistence:', err)
  );
export const db   = getFirestore(app);