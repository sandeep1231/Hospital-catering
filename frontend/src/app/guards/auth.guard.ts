import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private api: ApiService, private router: Router) {}
  canActivate(): boolean {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    if (this.api.isSuperAdmin()) { this.router.navigate(['/super-admin']); return false; }
    // Vendor admin without an active hospital can only access /admin/hospitals
    if (this.api.getUserRole() === 'admin' && !this.api.getUser()?.hospitalId) {
      this.router.navigate(['/admin/hospitals']);
      return false;
    }
    return true;
  }
}
