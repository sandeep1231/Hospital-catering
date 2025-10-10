import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}
  canActivate(): boolean {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    if (this.api.getUserRole() === 'admin') return true;
    this.toast.error('Admin access required');
    this.router.navigate(['/']);
    return false;
  }
}
