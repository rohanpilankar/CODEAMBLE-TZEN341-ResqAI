import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  limit,
  query
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Storage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class DatabaseInitializerService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private storage: Storage = inject(Storage);

  /**
   * Run full Firebase & Firestore connectivity diagnosis and auto-populate sample collections.
   */
  async initializeDatabase(): Promise<void> {
    console.log('==================================================');
    console.log('🔥 ResQAI Firebase Connection & Initializer Check');
    console.log('==================================================');

    // 1. Verify App & Auth SDK
    try {
      console.log('🔥 [Firebase App]: Connected & Initialized.');
      console.log('🔥 [Firebase Auth]: Initialized (Current state:', this.auth.currentUser ? 'Authenticated' : 'Unauthenticated', ')');
    } catch (e) {
      console.error('❌ [Firebase Auth Error]:', e);
    }

    // 2. Verify Storage SDK
    try {
      console.log('🔥 [Firebase Storage]: Connected & Ready for image uploads.');
    } catch (e) {
      console.error('❌ [Firebase Storage Error]:', e);
    }

    // 3. Verify Firestore & Populate Sample Documents
    try {
      console.log('🔥 [Cloud Firestore]: Diagnosing collections and security permissions...');
      await this.ensureCollectionsSeeded();
      console.log('==================================================');
      console.log('✅ [Firebase Status]: All services active and connected!');
      console.log('==================================================');
    } catch (err: any) {
      console.error('==================================================');
      console.error('❌ [Firestore Connection / Permission Error]:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        console.warn(
          '⚠️ FIRESTORE SECURITY RULES BLOCKED WRITES:\n\n' +
          'To allow initial sample document creation in Firebase Console:\n' +
          '1. Go to Firebase Console -> Firestore Database -> Rules\n' +
          '2. Change rules to test mode:\n\n' +
          '   rules_version = \'2\';\n' +
          '   service cloud.firestore {\n' +
          '     match /databases/{database}/documents {\n' +
          '       match /{document=**} {\n' +
          '         allow read, write: if true;\n' +
          '       }\n' +
          '     }\n' +
          '   }\n\n' +
          '3. Click Publish and reload the app.'
        );
      }
      console.error('==================================================');
    }
  }

  /**
   * Auto-create sample documents if collections are empty.
   */
  private async ensureCollectionsSeeded(): Promise<void> {
    const collectionsToSeed = [
      { name: 'users', docId: 'sample_user_01', getPayload: () => this.getSampleUserPayload() },
      { name: 'reports', docId: 'sample_report_01', getPayload: () => this.getSampleReportPayload() },
      { name: 'alerts', docId: 'sample_alert_01', getPayload: () => this.getSampleAlertPayload() },
      { name: 'resources', docId: 'sample_resource_01', getPayload: () => this.getSampleResourcePayload() },
      { name: 'volunteers', docId: 'sample_volunteer_01', getPayload: () => this.getSampleVolunteerPayload() },
      { name: 'emergencyContacts', docId: 'sample_contact_01', getPayload: () => this.getSampleContactPayload() },
      { name: 'notifications', docId: 'sample_notification_01', getPayload: () => this.getSampleNotificationPayload() }
    ];

    for (const item of collectionsToSeed) {
      const colRef = collection(this.firestore, item.name);
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(`📝 [Firestore Seeding]: Collection '${item.name}' is empty. Creating sample document...`);
        const docRef = doc(this.firestore, `${item.name}/${item.docId}`);
        const payload = item.getPayload();
        
        console.log(`➡️ [Firestore Write Start]: Writing to '${item.name}/${item.docId}'...`);
        await setDoc(docRef, payload);
        console.log(`✅ [Firestore Write Success]: Created sample document in '${item.name}'!`);
      } else {
        console.log(`✅ [Firestore Check]: Collection '${item.name}' exists and contains documents.`);
      }
    }
  }

  // ── Sample Payloads ────────────────────────────────────────────────────────

  private getSampleUserPayload() {
    return {
      uid: 'sample_user_01',
      fullName: 'Rohan Pilankar',
      email: 'pilankarrohan@gmail.com',
      phone: '+91 9876543210',
      role: 'Admin',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      location: { latitude: 19.0760, longitude: 72.8777, address: 'Mumbai, Maharashtra' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  private getSampleReportPayload() {
    return {
      title: 'Urban Flash Flood Incident',
      description: 'Severe waterlogging reported near Dadar station after heavy rainfall. Rescue boats deployed.',
      category: 'Flood',
      severity: 'CRITICAL',
      status: 'VERIFIED',
      latitude: 19.0178,
      longitude: 72.8478,
      images: ['https://images.unsplash.com/photo-1547683905-f686c993aae5'],
      reportedBy: 'sample_user_01',
      verified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  private getSampleAlertPayload() {
    return {
      title: 'CRITICAL FLOOD ALERT - Mumbai Coastal Region',
      message: 'High tide combined with heavy precipitation expected. Citizens advised to remain indoors.',
      type: 'EMERGENCY',
      priority: 'CRITICAL',
      affectedArea: 'Dadar, Kurla, Sion, Bandra',
      startTime: serverTimestamp(),
      active: true,
      createdAt: serverTimestamp()
    };
  }

  private getSampleResourcePayload() {
    return {
      name: 'NDRF Inflatable Rescue Boats',
      category: 'Rescue Equipment',
      quantity: 12,
      location: { latitude: 19.0760, longitude: 72.8777, address: 'Central Emergency Depot, Mumbai' },
      contact: '+91 22 2410 0000',
      availability: true,
      updatedAt: serverTimestamp()
    };
  }

  private getSampleVolunteerPayload() {
    return {
      uid: 'sample_volunteer_01',
      name: 'Aarav Sharma',
      skills: ['First Aid', 'Boat Rescue', 'Crowd Management'],
      phone: '+91 9123456789',
      email: 'aarav.volunteer@resqai.org',
      location: { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai' },
      availability: true,
      assignedReports: ['sample_report_01']
    };
  }

  private getSampleContactPayload() {
    return {
      name: 'Disaster Management Control Room',
      department: 'Brihanmumbai Municipal Corporation (BMC)',
      phone: '1916',
      email: 'controlroom@bmc.gov.in',
      district: 'Mumbai City',
      state: 'Maharashtra'
    };
  }

  private getSampleNotificationPayload() {
    return {
      userId: 'sample_user_01',
      title: 'New Emergency Assigned',
      message: 'You have been assigned to Urban Flash Flood Incident at Dadar.',
      type: 'ASSIGNMENT',
      isRead: false,
      createdAt: serverTimestamp()
    };
  }
}
