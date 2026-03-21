import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  template: `
    <div class="position-relative d-inline-block">
      <button class="btn btn-link text-white p-0 position-relative" (click)="toggle($event)" title="Notifications" style="font-size: 1.2rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
        </svg>
        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              *ngIf="unreadCount > 0"
              style="font-size: 0.6rem; padding: 3px 5px;">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown panel -->
      <div class="notification-panel card shadow-lg border-0" *ngIf="open"
           style="position: absolute; top: 100%; right: 0; width: 360px; max-height: 420px; z-index: 1300; margin-top: 8px;">
        <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
          <strong class="small">Notifications</strong>
          <button class="btn btn-link btn-sm text-primary p-0" (click)="markAllRead()" *ngIf="unreadCount > 0">
            Mark all read
          </button>
        </div>
        <div class="card-body p-0" style="max-height: 340px; overflow-y: auto;">
          <div *ngIf="notifications.length === 0" class="text-center text-muted py-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="mb-2 opacity-50" viewBox="0 0 16 16">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
            </svg>
            <div class="small">No notifications yet</div>
          </div>
          <div *ngFor="let n of notifications"
               class="notification-item px-3 py-2 border-bottom"
               [class.bg-light]="!n.read"
               (click)="onNotificationClick(n)"
               role="button"
               style="cursor: pointer;">
            <div class="d-flex align-items-start gap-2">
              <div class="mt-1" [ngClass]="iconClass(n.type)" style="font-size: 0.9rem;">
                <svg *ngIf="n.type==='patient_admitted'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                <svg *ngIf="n.type==='patient_discharged'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>
                <svg *ngIf="n.type==='diet_assigned' || n.type==='diet_changed'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/></svg>
                <svg *ngIf="n.type==='diet_delivered'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
              </div>
              <div class="flex-grow-1 overflow-hidden">
                <div class="fw-semibold small text-truncate">{{ n.title }}</div>
                <div class="text-muted small text-truncate">{{ n.message }}</div>
                <div class="text-muted" style="font-size: 0.7rem;">{{ timeAgo(n.createdAt) }}</div>
              </div>
              <div *ngIf="!n.read" class="mt-1">
                <span class="rounded-circle bg-primary d-inline-block" style="width: 8px; height: 8px;"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-item:hover { background-color: #f0f4ff !important; }
    .notification-panel { border-radius: 12px; overflow: hidden; animation: fadeInUp .2s ease both; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  open = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];
  private subs: Subscription[] = [];

  constructor(
    private notifService: NotificationService,
    private router: Router,
    private elRef: ElementRef
  ) {}

  ngOnInit() {
    this.subs.push(
      this.notifService.unreadCount.subscribe(c => this.unreadCount = c)
    );
    this.subs.push(
      this.notifService.notifications.subscribe(n => this.notifications = n)
    );
    this.notifService.startPolling();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this.notifService.fetchNotifications();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (this.open && !this.elRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  onNotificationClick(n: AppNotification) {
    if (!n.read) {
      this.notifService.markAsRead([n._id]);
    }
    this.open = false;
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  markAllRead() {
    this.notifService.markAllRead();
  }

  iconClass(type: string): string {
    switch (type) {
      case 'patient_admitted': return 'text-success';
      case 'patient_discharged': return 'text-danger';
      case 'diet_assigned':
      case 'diet_changed': return 'text-primary';
      case 'diet_delivered': return 'text-success';
      default: return 'text-secondary';
    }
  }

  timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
}
