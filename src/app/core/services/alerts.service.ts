import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { Alert, AlertPriority, AlertType } from '../models/alert.model';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AlertsService extends BaseFirestoreService<Alert> {
  protected override collectionName = 'alerts';

  /**
   * Get all active alerts for live broadcast panels.
   */
  getActiveAlerts(): Observable<Alert[]> {
    return this.getAll([where('active', '==', true), orderBy('createdAt', 'desc')]);
  }

  /**
   * Filter alerts by Priority level (CRITICAL, HIGH, MEDIUM, LOW).
   */
  getByPriority(priority: AlertPriority): Observable<Alert[]> {
    return this.getAll([where('priority', '==', priority), where('active', '==', true)]);
  }

  /**
   * Filter alerts by Type (EMERGENCY, WARNING, ADVISORY, INFO).
   */
  getByType(type: AlertType): Observable<Alert[]> {
    return this.getAll([where('type', '==', type), where('active', '==', true)]);
  }

  /**
   * Deactivate an alert banner.
   */
  deactivateAlert(id: string): Observable<void> {
    return this.update(id, { active: false } as any);
  }
}
