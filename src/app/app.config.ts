import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

// AngularFire Modern Standalone Initialization Imports
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter([
      {
        path: 'live-tracking',
        loadComponent: () =>
          import('./features/live-rescue-tracking/live-rescue-tracking.component').then(
            (m) => m.LiveRescueTrackingComponent
          )
      },
      { path: '', redirectTo: 'live-tracking', pathMatch: 'full' }
    ]),

    // ── ResQAI Firebase Standalone Providers (Project: "ResqAI") ───────────
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage())
  ]
};
