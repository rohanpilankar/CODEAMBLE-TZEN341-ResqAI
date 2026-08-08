import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { UserNotification } from '../models/notification.model';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService extends BaseFirestoreService<UserNotification> {
  protected override collectionName = 'notifications';

  /**
   * Get real-time notifications for a specific user ID.
   */
  getUserNotifications(userId: string): Observable<UserNotification[]> {
    return this.getAll([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }

  /**
   * Get unread notifications for a user.
   */
  getUnreadUserNotifications(userId: string): Observable<UserNotification[]> {
    return this.getAll([
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    ]);
  }

  /**
   * Mark a notification as read.
   */
  markAsRead(id: string): Observable<void> {
    return this.update(id, { isRead: true } as any);
  }
}
