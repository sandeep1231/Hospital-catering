import { Component } from '@angular/core';
import { ApiService } from './services/api.service';
import { Router } from '@angular/router';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  template: `
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top" style="background: linear-gradient(135deg, #0d9488, #10b981); backdrop-filter: blur(10px);">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" [routerLink]="api.isSuperAdmin() ? '/super-admin' : (isAdmin && !hasHospital ? '/admin/hospitals' : '/dashboard')" (click)="closeNav()">
        <span class="brand-icon d-flex align-items-center justify-content-center" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);font-weight:700;font-size:.8rem;letter-spacing:-.5px;">DF</span>
        Diet<span style="opacity:.7">Flow</span>
      </a>
      <button class="navbar-toggler border-0" type="button" (click)="navOpen = !navOpen" aria-controls="nav" [attr.aria-expanded]="navOpen" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" [class.show]="navOpen" id="nav">
        <ul class="navbar-nav me-auto gap-1" *ngIf="api.isLoggedIn() && !api.isSuperAdmin()">
          <li class="nav-item" *ngIf="hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/dashboard" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-grid-1x2"></i> Dashboard</a></li>
          <li class="nav-item" *ngIf="hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/patients" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-people"></i> Patients</a></li>
          <li class="nav-item" *ngIf="isDietSupervisorOrAdmin && hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/diet-supervisor" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-clipboard2-pulse"></i> Diet Supervisor</a></li>
          <li class="nav-item" *ngIf="isAdmin && hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/admin/diets" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-egg-fried"></i> Diets</a></li>
          <li class="nav-item" *ngIf="isAdmin && hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/admin/users" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-person-gear"></i> Users</a></li>
          <li class="nav-item" *ngIf="isAdmin"><a class="nav-link d-flex align-items-center gap-1" routerLink="/admin/hospitals" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-hospital"></i> Hospitals</a></li>
          <li class="nav-item" *ngIf="isAdmin && hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/reports" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-bar-chart-line"></i> Reports</a></li>
          <li class="nav-item" *ngIf="isAdmin && hasHospital"><a class="nav-link d-flex align-items-center gap-1" routerLink="/admin/audit-logs" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-journal-text"></i> Audit Logs</a></li>
        </ul>
        <ul class="navbar-nav me-auto gap-1" *ngIf="api.isLoggedIn() && api.isSuperAdmin()">
          <li class="nav-item"><a class="nav-link d-flex align-items-center gap-1" routerLink="/super-admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeNav()"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
          <li class="nav-item"><a class="nav-link d-flex align-items-center gap-1" routerLink="/super-admin/vendors" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-shop"></i> Vendors</a></li>
          <li class="nav-item"><a class="nav-link d-flex align-items-center gap-1" routerLink="/super-admin/hospitals" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-hospital"></i> Hospitals</a></li>
          <li class="nav-item"><a class="nav-link d-flex align-items-center gap-1" routerLink="/super-admin/requests" routerLinkActive="active" (click)="closeNav()"><i class="bi bi-bell"></i> Requests</a></li>
        </ul>
        <div class="d-flex align-items-center gap-3 ms-auto">
          <ng-container *ngIf="api.isLoggedIn(); else loggedOut">
            <app-notification-bell></app-notification-bell>
            <div class="d-none d-md-flex align-items-center gap-2">
              <div class="user-avatar" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:.8rem;color:#fff;">
                {{ userInitials }}
              </div>
              <span class="text-white-50 small">{{ api.getUser()?.name }}</span>
            </div>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.2);" (click)="logout()">
              <i class="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          </ng-container>
          <ng-template #loggedOut>
            <a class="btn btn-light btn-sm fw-semibold" routerLink="/login" (click)="closeNav()"><i class="bi bi-box-arrow-in-right me-1"></i>Sign in</a>
          </ng-template>
        </div>
      </div>
    </div>
  </nav>

  <main class="py-4">
    <div class="container animate-fade-in">
      <div *ngIf="api.getReadOnly()" class="alert alert-warning d-flex align-items-center gap-2 mb-3" role="alert">
        <i class="bi bi-lock-fill"></i>
        <span><strong>Read-only mode</strong> — your hospital assignment has been revoked. You can view data but cannot make changes.</span>
      </div>
      <router-outlet></router-outlet>
    </div>
  </main>

  <app-toast-container></app-toast-container>

  <footer style="background: linear-gradient(135deg, #1e293b, #0f172a);" class="text-white py-4 mt-auto">
    <div class="container d-flex justify-content-between align-items-center">
      <div>
        <strong class="d-flex align-items-center gap-2">
          <span style="width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#0d9488,#10b981);display:inline-flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;letter-spacing:-.5px;">DF</span>
          DietFlow
        </strong>
        <div class="small text-white-50 mt-1">Hospital Diet Management Platform</div>
      </div>
      <div class="small text-white-50">&copy; {{ year }} DietFlow &middot; dietflow.in</div>
    </div>
  </footer>
  `,
  styles: [`
    .nav-link { font-size: .875rem; border-radius: 6px; padding: .4rem .75rem !important; opacity: .8; transition: all .15s ease; }
    .nav-link:hover, .nav-link.active { opacity: 1; background: rgba(255,255,255,.12); }
  `]
})
export class AppComponent {
  year = new Date().getFullYear();
  navOpen = false;
  constructor(public api: ApiService, private router: Router, private notifService: NotificationService) { }
  get isAdmin() { return this.api.getUserRole() === 'admin'; }
  get hasHospital() { return !!this.api.getUser()?.hospitalId; }
  get isDietSupervisorOrAdmin() { const r = this.api.getUserRole(); return r === 'admin' || r === 'diet-supervisor' || r === 'dietician'; }
  get userInitials(): string {
    const name = this.api.getUser()?.name || '';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (name.substring(0, 2).toUpperCase());
  }
  closeNav() { this.navOpen = false; }
  logout() { this.notifService.reset(); this.api.logout(); this.closeNav(); this.router.navigate(['/login']); }
}
