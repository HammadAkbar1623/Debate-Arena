import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getAuth, 
  sendEmailVerification  
} from 'firebase/auth';


const firebaseConfig = {
  apiKey: 'AIzaSyBVeZrdT2rTdcTzIAiORQPXHkwQQGTl3Tg',
  authDomain: 'debate-arena-d6664.firebaseapp.com',
  projectId: 'debate-arena-d6664',
  storageBucket: 'debate-arena-d6664.appspot.com', 
  messagingSenderId: '954623284921',
  appId: '1:954623284921:web:5f52461e3e3a1a19b42d68'
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with proper settings
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,  // Important for React Native
  useFetchStreams: false,              // Disable streams for better stability
});

export { auth, db };
export { sendEmailVerification };
export default app;