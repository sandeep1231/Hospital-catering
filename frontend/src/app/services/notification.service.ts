import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdByName: string;
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private unreadCount$ = new BehaviorSubject<number>(0);
  private notifications$ = new BehaviorSubject<AppNotification[]>([]);
  private pollSub: Subscription | null = null;

  unreadCount = this.unreadCount$.asObservable();
  notifications = this.notifications$.asObservable();

  constructor(private api: ApiService) {}

  /** Start polling for unread count every 30 seconds */
  startPolling() {
    this.stopPolling();
    // Fetch immediately
    this.fetchUnreadCount();
    // Then poll every 30s
    this.pollSub = interval(30000).pipe(
      filter(() => this.api.isLoggedIn()),
      switchMap(() => this.api.get('/notifications/unread-count'))
    ).subscribe({
      next: (res: any) => this.unreadCount$.next(res?.count || 0),
      error: () => {} // silently ignore polling errors
    });
  }

  stopPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  fetchUnreadCount() {
    if (!this.api.isLoggedIn()) return;
    this.api.get('/notifications/unread-count').subscribe({
      next: (res: any) => this.unreadCount$.next(res?.count || 0),
      error: () => {}
    });
  }

  fetchNotifications() {
    if (!this.api.isLoggedIn()) return;
    this.api.get('/notifications').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : [];
        this.notifications$.next(list);
        const unread = list.filter((n: AppNotification) => !n.read).length;
        this.unreadCount$.next(unread);
      },
      error: () => {}
    });
  }

  markAsRead(ids: string[]) {
    return this.api.post('/notifications/mark-read', { ids }).subscribe({
      next: () => {
        // Update local state
        const current = this.notifications$.value.map(n =>
          ids.includes(n._id) ? { ...n, read: true } : n
        );
        this.notifications$.next(current);
        const unread = current.filter(n => !n.read).length;
        this.unreadCount$.next(unread);
      },
      error: () => {}
    });
  }

  markAllRead() {
    return this.api.post('/notifications/mark-all-read', {}).subscribe({
      next: () => {
        const current = this.notifications$.value.map(n => ({ ...n, read: true }));
        this.notifications$.next(current);
        this.unreadCount$.next(0);
      },
      error: () => {}
    });
  }

  reset() {
    this.stopPolling();
    this.unreadCount$.next(0);
    this.notifications$.next([]);
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
