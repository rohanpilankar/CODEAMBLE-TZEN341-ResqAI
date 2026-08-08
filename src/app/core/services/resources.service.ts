import { Injectable } from '@angular/core';
import { BaseFirestoreService } from './base-firestore.service';
import { EmergencyResource, ResourceCategory } from '../models/resource.model';
import { Observable } from 'rxjs';
import { where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ResourcesService extends BaseFirestoreService<EmergencyResource> {
  protected override collectionName = 'resources';

  /**
   * Get all currently available emergency resources.
   */
  getAvailableResources(): Observable<EmergencyResource[]> {
    return this.getAll([where('availability', '==', true)]);
  }

  /**
   * Filter emergency resources by Category (Medical, Food, Water, Shelter, etc.).
   */
  getByCategory(category: ResourceCategory): Observable<EmergencyResource[]> {
    return this.getAll([where('category', '==', category), where('availability', '==', true)]);
  }

  /**
   * Update resource quantity and availability status.
   */
  updateQuantity(id: string, newQuantity: number): Observable<void> {
    const isAvailable = newQuantity > 0;
    return this.update(id, { quantity: newQuantity, availability: isAvailable } as any);
  }
}
