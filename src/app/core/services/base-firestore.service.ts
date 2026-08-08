import { inject, signal, WritableSignal } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export abstract class BaseFirestoreService<T extends { id?: string }> {
  protected firestore: Firestore = inject(Firestore);
  protected abstract collectionName: string;

  // Angular Signals for reactive UI loading and error state tracking
  public loading: WritableSignal<boolean> = signal(false);
  public error: WritableSignal<string | null> = signal(null);

  protected getCollectionRef() {
    return collection(this.firestore, this.collectionName);
  }

  protected getDocRef(id: string) {
    return doc(this.firestore, `${this.collectionName}/${id}`);
  }

  /**
   * Create a new document in the collection with automated serverTimestamp.
   */
  create(data: Omit<T, 'id'>, customId?: string): Observable<string> {
    this.loading.set(true);
    this.error.set(null);

    const payload = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log(`➡️ [Firestore Write Start]: Creating document in '${this.collectionName}'...`, data);

    if (customId) {
      const docRef = this.getDocRef(customId);
      return from(setDoc(docRef, payload)).pipe(
        map(() => customId),
        tap((id) => {
          this.loading.set(false);
          console.log(`✅ [Firestore Write Success]: Document written to '${this.collectionName}/${id}'!`);
        }),
        catchError(err => this.handleError(err))
      );
    } else {
      return from(addDoc(this.getCollectionRef(), payload)).pipe(
        map(docRef => docRef.id),
        tap((id) => {
          this.loading.set(false);
          console.log(`✅ [Firestore Write Success]: Document written to '${this.collectionName}/${id}'!`);
        }),
        catchError(err => this.handleError(err))
      );
    }
  }

  /**
   * Fetch a document by ID with real-time snapshot listener.
   */
  getById(id: string): Observable<T | undefined> {
    this.loading.set(true);
    this.error.set(null);
    console.log(`🔍 [Firestore Read]: Listening to document '${this.collectionName}/${id}'...`);
    return docData(this.getDocRef(id), { idField: 'id' }).pipe(
      map(data => data as T),
      tap((data) => {
        this.loading.set(false);
        console.log(`✅ [Firestore Read Success]: Received document '${this.collectionName}/${id}'`, data);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Get all documents with optional constraints and real-time snapshot listener.
   */
  getAll(constraints: QueryConstraint[] = []): Observable<T[]> {
    this.loading.set(true);
    this.error.set(null);
    const q = query(this.getCollectionRef(), ...constraints);
    console.log(`🔍 [Firestore Query]: Listening to collection '${this.collectionName}'...`);
    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data as T[]),
      tap((data) => {
        this.loading.set(false);
        console.log(`✅ [Firestore Query Success]: Received ${data.length} documents from '${this.collectionName}'`);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Update an existing document with automated updatedAt timestamp.
   */
  update(id: string, data: Partial<T>): Observable<void> {
    this.loading.set(true);
    this.error.set(null);
    const payload = {
      ...data,
      updatedAt: serverTimestamp()
    };

    console.log(`➡️ [Firestore Update Start]: Updating document '${this.collectionName}/${id}'...`, data);
    return from(updateDoc(this.getDocRef(id), payload as DocumentData)).pipe(
      tap(() => {
        this.loading.set(false);
        console.log(`✅ [Firestore Update Success]: Document '${this.collectionName}/${id}' updated successfully!`);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Delete a document by ID.
   */
  delete(id: string): Observable<void> {
    this.loading.set(true);
    this.error.set(null);
    console.log(`➡️ [Firestore Delete Start]: Deleting document '${this.collectionName}/${id}'...`);
    return from(deleteDoc(this.getDocRef(id))).pipe(
      tap(() => {
        this.loading.set(false);
        console.log(`✅ [Firestore Delete Success]: Document '${this.collectionName}/${id}' deleted successfully!`);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Search collection by field matching keyword/value.
   */
  search(fieldName: string, value: any): Observable<T[]> {
    this.loading.set(true);
    this.error.set(null);
    const q = query(this.getCollectionRef(), where(fieldName, '==', value));
    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data as T[]),
      tap((data) => {
        this.loading.set(false);
        console.log(`✅ [Firestore Search Success]: '${this.collectionName}' where ${fieldName} == ${value} (${data.length} results)`);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Centralized error handler updating reactive signals and printing explicit diagnostic advice.
   */
  protected handleError(err: any): Observable<never> {
    this.loading.set(false);
    const errorMessage = err?.message || 'An unexpected Firestore error occurred.';
    this.error.set(errorMessage);
    console.error(`❌ [Firestore Error - ${this.collectionName}]:`, err);
    if (err?.code === 'permission-denied') {
      console.warn(
        `⚠️ Firestore Security Rules Permission Denied on collection '${this.collectionName}'.\n` +
        'Check Firebase Console -> Firestore Database -> Rules.'
      );
    }
    throw err;
  }
}
