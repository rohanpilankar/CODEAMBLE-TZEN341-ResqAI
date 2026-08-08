import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { Volunteer } from '../models/volunteer.model';
import { Observable } from 'rxjs';
import { where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class VolunteersService extends BaseFirestoreService<Volunteer> {
  protected override collectionName = 'volunteers';

  /**
   * Get all currently available volunteers ready for deployment.
   */
  getAvailableVolunteers(): Observable<Volunteer[]> {
    return this.getAll([where('availability', '==', true)]);
  }

  /**
   * Assign a disaster report ID to a volunteer.
   */
  assignReport(volunteerUid: string, reportId: string, currentAssigned: string[] = []): Observable<void> {
    const updatedAssigned = Array.from(new Set([...currentAssigned, reportId]));
    return this.update(volunteerUid, { assignedReports: updatedAssigned } as any);
  }

  /**
   * Toggle volunteer availability status.
   */
  toggleAvailability(volunteerUid: string, availability: boolean): Observable<void> {
    return this.update(volunteerUid, { availability } as any);
  }
}
