import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { UserProfile, UserRole } from '../models/user.model';
import { Observable } from 'rxjs';
import { where, orderBy, query } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class UsersService extends BaseFirestoreService<UserProfile> {
  protected override collectionName = 'users';

  /**
   * Get users filtered by Role (e.g. Government, RescueTeam, Volunteer, Citizen).
   */
  getByRole(role: UserRole): Observable<UserProfile[]> {
    return this.getAll([where('role', '==', role)]);
  }

  /**
   * Search users by Email address.
   */
  getByEmail(email: string): Observable<UserProfile[]> {
    return this.search('email', email);
  }
}
