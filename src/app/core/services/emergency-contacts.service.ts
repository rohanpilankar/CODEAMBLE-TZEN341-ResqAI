import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { EmergencyContact } from '../models/emergency-contact.model';
import { Observable } from 'rxjs';
import { where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class EmergencyContactsService extends BaseFirestoreService<EmergencyContact> {
  protected override collectionName = 'emergencyContacts';

  /**
   * Filter emergency contacts by District.
   */
  getByDistrict(district: string): Observable<EmergencyContact[]> {
    return this.getAll([where('district', '==', district)]);
  }

  /**
   * Filter emergency contacts by Department (e.g. Police, Fire, NDRF, Medical).
   */
  getByDepartment(department: string): Observable<EmergencyContact[]> {
    return this.getAll([where('department', '==', department)]);
  }

  /**
   * Filter emergency contacts by State.
   */
  getByState(state: string): Observable<EmergencyContact[]> {
    return this.getAll([where('state', '==', state)]);
  }
}
