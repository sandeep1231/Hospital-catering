import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  hospitals: any[] = [];
  hospitalId = '';
  loading = false;
  showPassword = false;
  step: 1 | 2 = 1;
  vendorName: string | null = null;
  vendorStatus: string | null = null;
  preLoginRole: string | null = null;

  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}

  onSubmit(e: Event) {
    e.preventDefault();
    if (this.step === 1) {
      this.preLogin();
    } else {
      this.login();
    }
  }

  preLogin() {
    this.error = '';
    this.loading = true;
    this.api.post('/auth/pre-login', { email: this.email, password: this.password }).subscribe((res: any) => {
      this.loading = false;
      this.preLoginRole = res.role;
      // Super-admin: go straight to login (no hospital needed)
      if (res.role === 'super-admin') {
        this.login();
        return;
      }
      this.vendorName = res.vendorName;
      this.vendorStatus = res.vendorStatus;
      if (res.vendorStatus && res.vendorStatus !== 'approved') {
        this.error = `Your vendor account is ${res.vendorStatus}. Please contact the administrator.`;
        return;
      }
      this.hospitals = res.hospitals || [];
      if (this.hospitals.length === 1 && !this.hospitals[0].inactive) {
        this.hospitalId = this.hospitals[0]._id;
      }
      if (this.hospitals.length === 0 && !res.vendorName) {
        // Legacy user with no hospitals — try direct login
        this.login();
        return;
      }
      if (this.hospitals.length === 0 && res.vendorName) {
        // Approved vendor with 0 hospitals — login without hospital, redirect to hospitals page
        this.login();
        return;
      }
      this.step = 2;
    }, err => {
      this.error = err?.error?.message || 'Invalid credentials';
      this.loading = false;
    });
  }

  login() {
    this.error = '';
    this.loading = true;
    this.api.post('/auth/login', { email: this.email, password: this.password, hospitalId: this.hospitalId || undefined }).subscribe((res: any) => {
      if (res && res.token) {
        this.api.setToken(res.token);
        this.toast.success('Signed in');
        const user = this.api.getUser();
        if (res.role === 'super-admin' || this.api.isSuperAdmin()) {
          this.router.navigate(['/super-admin']);
        } else if (user?.vendorId && !user?.hospitalId) {
          // Vendor with no hospital selected — go to hospital management
          this.router.navigate(['/admin/hospitals']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.error = 'Invalid response';
      }
      this.loading = false;
    }, err => {
      this.error = err?.error?.message || 'Sign in failed';
      this.loading = false;
    });
  }

  goBack() {
    this.step = 1;
    this.error = '';
    this.hospitalId = '';
    this.hospitals = [];
    this.vendorName = null;
    this.vendorStatus = null;
  }
}
