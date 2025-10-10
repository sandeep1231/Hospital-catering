import { Component } from '@angular/core';
import { ApiService } from './services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm sticky-top">
    <div class="container">
      <a class="navbar-brand" routerLink="/" (click)="closeNav()">Hospital Catering</a>
      <button class="navbar-toggler" type="button" (click)="navOpen = !navOpen" aria-controls="nav" [attr.aria-expanded]="navOpen" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" [class.show]="navOpen" id="nav">
        <ul class="navbar-nav me-auto" *ngIf="api.isLoggedIn()">
          <li class="nav-item"><a class="nav-link" routerLink="/patients" routerLinkActive="active" (click)="closeNav()">Patients</a></li>
          <li class="nav-item"><a class="nav-link" routerLink="/orders" routerLinkActive="active" (click)="closeNav()">Orders</a></li>
          <li class="nav-item"><a class="nav-link" routerLink="/diet-plans" routerLinkActive="active" (click)="closeNav()">Diet Plans</a></li>
          <li class="nav-item" *ngIf="isAdmin"><a class="nav-link" routerLink="/admin/users" routerLinkActive="active" (click)="closeNav()">Users</a></li>
          <li class="nav-item" *ngIf="isAdmin"><a class="nav-link" routerLink="/admin/invite" routerLinkActive="active" (click)="closeNav()">Invite</a></li>
        </ul>
        <div class="d-flex align-items-center gap-2 ms-auto">
          <ng-container *ngIf="api.isLoggedIn(); else loggedOut">
            <span class="navbar-text small d-none d-md-inline text-white-50">Hello, {{ api.getUser()?.name }}</span>
            <button class="btn btn-outline-light btn-sm" (click)="logout()">Logout</button>
          </ng-container>
          <ng-template #loggedOut>
            <a class="btn btn-light btn-sm" routerLink="/login" (click)="closeNav()">Sign in</a>
          </ng-template>
        </div>
      </div>
    </div>
  </nav>

  <main class="py-5">
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  </main>

  <footer class="bg-dark text-white py-4 mt-5">
    <div class="container d-flex justify-content-between align-items-center">
      <div>
        <strong>Hospital Catering</strong>
        <div class="small">Manage diet plans, orders and deliveries</div>
      </div>
      <div class="small">© {{ year }} Hospital Catering</div>
    </div>
  </footer>
  `
})
export class AppComponent { 
  year = new Date().getFullYear();
  navOpen = false;
  constructor(public api: ApiService, private router: Router) {}
  get isAdmin() { return this.api.getUserRole() === 'admin'; }
  closeNav() { this.navOpen = false; }
  logout() { this.api.logout(); this.closeNav(); this.router.navigate(['/login']); }
}
