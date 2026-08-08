import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
  User as FirebaseUser,
  UserCredential
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { RegisterUserData, UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  // Observable auth state
  public authState$: Observable<FirebaseUser | null> = authState(this.auth);

  // Angular Signals for reactive UI state
  public currentUserSignal: WritableSignal<UserProfile | null> = signal(null);
  public loadingSignal: WritableSignal<boolean> = signal(false);
  public errorSignal: WritableSignal<string | null> = signal(null);

  constructor() {
    // Automatically keep current user profile synchronized with Auth State
    this.authState$.pipe(
      switchMap(user => {
        if (user) {
          return this.getUserProfile(user.uid);
        } else {
          return of(null);
        }
      })
    ).subscribe(profile => {
      this.currentUserSignal.set(profile);
    });
  }

  /**
   * Register a new user with Email & Password and store user profile in Firestore.
   */
  register(email: string, password: string, userData: RegisterUserData): Observable<UserProfile> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((cred: UserCredential) => {
        const user = cred.user;
        const profilePayload: UserProfile = {
          uid: user.uid,
          fullName: userData.fullName,
          email: user.email || email,
          phone: userData.phone || '',
          role: userData.role || 'Citizen',
          profileImage: userData.profileImage || '',
          location: userData.location,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any
        };

        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        return from(setDoc(userDocRef, profilePayload)).pipe(
          map(() => profilePayload)
        );
      }),
      tap(profile => {
        this.currentUserSignal.set(profile);
        this.loadingSignal.set(false);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Login user with Email & Password.
   */
  login(email: string, password: string): Observable<FirebaseUser> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(cred => cred.user),
      tap(() => this.loadingSignal.set(false)),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Logout current authenticated user.
   */
  logout(): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.currentUserSignal.set(null);
        this.loadingSignal.set(false);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Send password reset email.
   */
  resetPassword(email: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Update authenticated user profile in Firestore.
   */
  updateProfile(data: Partial<UserProfile>): Observable<void> {
    const currentUid = this.auth.currentUser?.uid;
    if (!currentUid) {
      const err = new Error('No user currently authenticated.');
      this.errorSignal.set(err.message);
      throw err;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const userDocRef = doc(this.firestore, `users/${currentUid}`);
    const payload = {
      ...data,
      updatedAt: serverTimestamp()
    };

    return from(updateDoc(userDocRef, payload as any)).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Get current authenticated Firebase user instance.
   */
  getCurrentAuthUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Fetch Firestore User Profile document by UID.
   */
  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    return docData(userDocRef).pipe(
      map(data => (data ? (data as UserProfile) : null)),
      catchError(() => of(null))
    );
  }

  /**
   * Centralized error handling updating error signal.
   */
  private handleError(err: any): Observable<never> {
    this.loadingSignal.set(false);
    const msg = err?.message || 'Authentication operation failed.';
    this.errorSignal.set(msg);
    console.error('[AuthService Error]:', err);
    throw err;
  }
}
