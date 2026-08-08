import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { DisasterReport, DisasterCategory, SeverityLevel, ReportStatus } from '../models/report.model';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ReportsService extends BaseFirestoreService<DisasterReport> {
  protected override collectionName = 'reports';

  /**
   * Get all reports ordered by creation timestamp (newest first).
   */
  getRecentReports(): Observable<DisasterReport[]> {
    return this.getAll([orderBy('createdAt', 'desc')]);
  }

  /**
   * Filter reports by Severity level (CRITICAL, HIGH, MEDIUM, LOW).
   */
  getBySeverity(severity: SeverityLevel): Observable<DisasterReport[]> {
    return this.getAll([where('severity', '==', severity), orderBy('createdAt', 'desc')]);
  }

  /**
   * Filter reports by Disaster Category (Flood, Earthquake, Fire, etc.).
   */
  getByCategory(category: DisasterCategory): Observable<DisasterReport[]> {
    return this.getAll([where('category', '==', category), orderBy('createdAt', 'desc')]);
  }

  /**
   * Filter reports by Status (REPORTED, VERIFIED, IN_PROGRESS, RESOLVED).
   */
  getByStatus(status: ReportStatus): Observable<DisasterReport[]> {
    return this.getAll([where('status', '==', status)]);
  }

  /**
   * Get all reports filed by a specific user UID.
   */
  getByUser(uid: string): Observable<DisasterReport[]> {
    return this.getAll([where('reportedBy', '==', uid), orderBy('createdAt', 'desc')]);
  }

  /**
   * Mark a report as verified by rescue/admin authorities.
   */
  verifyReport(id: string, verified: boolean = true): Observable<void> {
    return this.update(id, { verified, status: 'VERIFIED' } as any);
  }
}
