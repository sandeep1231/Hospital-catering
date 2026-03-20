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
    if (r === 'admin' || r === 'diet-supervisor' || r === 'dietician') return true;
    this.toast.error('Diet supervisor access required');
    this.router.navigate(['/']);
    return false;
  }
}
