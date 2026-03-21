import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}
  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    const r = this.api.getUserRole();
    if (r === 'admin' || r === 'super-admin') {
      // Vendor admin without hospital may only access the hospitals page
      if (r === 'admin' && !this.api.getUser()?.hospitalId && route.routeConfig?.path !== 'admin/hospitals') {
        this.router.navigate(['/admin/hospitals']);
        return false;
      }
      return true;
    }
    this.toast.error('Admin access required');
    this.router.navigate(['/dashboard']);
    return false;
  }
}
