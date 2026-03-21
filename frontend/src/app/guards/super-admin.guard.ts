import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class SuperAdminGuard implements CanActivate {
  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}
  canActivate(): boolean {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    if (this.api.isSuperAdmin()) return true;
    this.toast.error('Super Admin access required');
    this.router.navigate(['/dashboard']);
    return false;
  }
}
