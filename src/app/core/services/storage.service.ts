import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL as getStorageDownloadURL,
  deleteObject,
  UploadTaskSnapshot
} from '@angular/fire/storage';
import { Observable, from, Subject } from 'rxjs';

export interface UploadProgress {
  progress: number; // 0 - 100%
  bytesTransferred: number;
  totalBytes: number;
  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Storage = inject(Storage);

  public uploadProgressSignal: WritableSignal<number> = signal(0);
  public isUploadingSignal: WritableSignal<boolean> = signal(false);
  public errorSignal: WritableSignal<string | null> = signal(null);

  // Default image constraints
  public readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  public readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Validate image file size and MIME type.
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid image type '${file.type}'. Allowed types: JPEG, PNG, WebP.`
      };
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds maximum allowed limit of 5 MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Upload an image to Firebase Storage with progress tracking and return download URL.
   */
  uploadImage(path: string, file: File): Observable<string> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      const err = new Error(validation.error);
      this.errorSignal.set(validation.error || 'Validation error');
      throw err;
    }

    this.isUploadingSignal.set(true);
    this.uploadProgressSignal.set(0);
    this.errorSignal.set(null);

    const resultSubject = new Subject<string>();
    const storageRef = ref(this.storage, `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        this.uploadProgressSignal.set(progress);
      },
      (error) => {
        this.isUploadingSignal.set(false);
        const errMsg = error?.message || 'Firebase Storage upload failed.';
        this.errorSignal.set(errMsg);
        console.error('[StorageService Upload Error]:', error);
        resultSubject.error(error);
      },
      async () => {
        try {
          const downloadUrl = await getStorageDownloadURL(uploadTask.snapshot.ref);
          this.isUploadingSignal.set(false);
          this.uploadProgressSignal.set(100);
          resultSubject.next(downloadUrl);
          resultSubject.complete();
        } catch (urlErr) {
          this.isUploadingSignal.set(false);
          this.errorSignal.set('Failed to retrieve download URL.');
          resultSubject.error(urlErr);
        }
      }
    );

    return resultSubject.asObservable();
  }

  /**
   * Delete an image from Firebase Storage by HTTPS download URL or path.
   */
  deleteImage(urlOrPath: string): Observable<void> {
    this.errorSignal.set(null);
    let imageRef;

    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      imageRef = ref(this.storage, urlOrPath);
    } else {
      imageRef = ref(this.storage, urlOrPath);
    }

    return from(deleteObject(imageRef));
  }

  /**
   * Retrieve download URL for a storage path.
   */
  getDownloadURL(storagePath: string): Observable<string> {
    const storageRef = ref(this.storage, storagePath);
    return from(getStorageDownloadURL(storageRef));
  }
}
