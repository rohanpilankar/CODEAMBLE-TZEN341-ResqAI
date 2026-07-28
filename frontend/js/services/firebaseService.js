import { CONFIG } from '../config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js';
import { getDatabase, ref, set, push, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, setDoc, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.rtdb = null;
    this.auth = null;
    this.analytics = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      this.app = initializeApp(CONFIG.FIREBASE);
      this.db = getFirestore(this.app);
      this.rtdb = getDatabase(this.app);
      this.auth = getAuth(this.app);
      this.analytics = getAnalytics(this.app);
      this.isInitialized = true;
      console.log('🔥 Firebase Auth, Firestore & Realtime Database initialized successfully!');
    } catch (err) {
      console.error('Firebase initialization error:', err);
    }
  }

  /**
   * Google Sign-in via Firebase Authentication Popup
   */
  async loginWithGoogle(selectedRole = 'Citizen') {
    if (!this.isInitialized) this.init();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const userData = {
        id: user.uid,
        full_name: user.displayName || user.email.split('@')[0],
        email: user.email,
        phone_number: user.phoneNumber || '',
        photo_url: user.photoURL || '',
        role: selectedRole,
        provider: 'google.com',
        last_login: new Date().toISOString()
      };

      // Sync user profile to Firestore
      await this.saveUserProfile(user.uid, userData);

      console.log('🔥 Google Authentication successful:', user.email);
      return { user: userData, token: idToken };
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        alert(
          '⚠️ Unauthorized Domain Error (auth/unauthorized-domain)\n\n' +
          'Firebase security requires authorizing your current domain.\n\n' +
          'Solution 1: Open the website using "http://localhost:3000/login.html" instead of 127.0.0.1.\n\n' +
          'Solution 2: Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add "' + window.location.hostname + '".'
        );
      }
      throw err;
    }
  }

  // ─── Realtime Database (RTDB) Methods ──────────────────────────────────────

  async pushRealtimeIncident(incidentData) {
    if (!this.isInitialized) this.init();
    try {
      const incidentsRef = ref(this.rtdb, 'incidents');
      const newIncidentRef = push(incidentsRef);
      const payload = {
        ...incidentData,
        firebase_id: newIncidentRef.key,
        created_at: serverTimestamp(),
      };
      await set(newIncidentRef, payload);
      console.log('🔥 Incident saved to Realtime Database:', newIncidentRef.key);
      return newIncidentRef.key;
    } catch (err) {
      console.error('Firebase RTDB push error:', err);
      throw err;
    }
  }

  listenRealtimeIncidents(callback) {
    if (!this.isInitialized) this.init();
    try {
      const incidentsRef = ref(this.rtdb, 'incidents');
      onValue(incidentsRef, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.values(data) : [];
        callback(list);
      });
    } catch (err) {
      console.error('Firebase RTDB listen error:', err);
    }
  }

  async updateLiveLocation(userId, locationData) {
    if (!this.isInitialized) this.init();
    try {
      const userLocRef = ref(this.rtdb, `live_locations/${userId}`);
      await set(userLocRef, {
        ...locationData,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Firebase live location update error:', err);
    }
  }

  // ─── Firestore Database Methods ────────────────────────────────────────────

  async addFirestoreRecord(collectionName, recordData) {
    if (!this.isInitialized) this.init();
    try {
      const docRef = await addDoc(collection(this.db, collectionName), {
        ...recordData,
        timestamp: new Date().toISOString(),
      });
      console.log(`🔥 Document written to Firestore [${collectionName}]:`, docRef.id);
      return docRef.id;
    } catch (err) {
      console.error(`Firestore addDoc error [${collectionName}]:`, err);
      throw err;
    }
  }

  async saveUserProfile(userId, profileData) {
    if (!this.isInitialized) this.init();
    try {
      const userDocRef = doc(this.db, 'users', String(userId));
      await setDoc(userDocRef, {
        ...profileData,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      console.log('🔥 User profile saved to Firestore:', userId);
    } catch (err) {
      console.error('Firestore saveUserProfile error:', err);
    }
  }

  listenFirestoreCollection(collectionName, callback) {
    if (!this.isInitialized) this.init();
    try {
      const colRef = collection(this.db, collectionName);
      return onSnapshot(colRef, (snapshot) => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(records);
      });
    } catch (err) {
      console.error(`Firestore snapshot listen error [${collectionName}]:`, err);
    }
  }
}

export const firebaseService = new FirebaseService();
