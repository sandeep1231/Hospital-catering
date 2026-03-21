import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class DietSupervisorGuard implements CanActivate {
  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}
  canActivate(): boolean {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    const r = this.api.getUserRole();
    if (r === 'admin' || r === 'diet-supervisor' || r === 'dietician' || r === 'super-admin') {
      // Block access if no hospital assigned
      if (!this.api.getUser()?.hospitalId) {
        this.router.navigate([r === 'admin' ? '/admin/hospitals' : '/login']);
        return false;
      }
      return true;
    }
    this.toast.error('Diet supervisor access required');
    this.router.navigate(['/dashboard']);
    return false;
  }
}
