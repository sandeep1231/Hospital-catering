import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-vendor-register',
  template: `
  <div class="login-hero container py-5 d-flex flex-column align-items-center" style="min-height: 100vh; position: relative; z-index: 1;">
    <div class="text-center mb-4">
      <div class="d-inline-flex align-items-center justify-content-center mb-3" style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,.2);backdrop-filter:blur(10px);">
        <span style="font-size:1.25rem;font-weight:700;color:#fff;letter-spacing:-1px;">DF</span>
      </div>
      <div class="h3 fw-bold text-white">Diet<span style="opacity:.7">Flow</span></div>
      <div style="color: rgba(255,255,255,.7);">Vendor Registration</div>
    </div>

    <div class="card login-card" style="max-width: 520px; width: 100%;">
      <div class="card-body p-4">
        <!-- Success state -->
        <div *ngIf="submitted" class="text-center py-4">
          <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
          <h5 class="mt-3 fw-bold">Registration Submitted!</h5>
          <p class="text-muted">Your vendor registration is under review. You'll be able to log in once approved by the super admin.</p>
          <a routerLink="/login" class="btn btn-primary mt-2"><i class="bi bi-box-arrow-in-right me-1"></i>Back to Login</a>
        </div>

        <!-- Registration form -->
        <ng-container *ngIf="!submitted">
          <h4 class="mb-1 fw-bold">Register as Vendor</h4>
          <p class="text-muted small mb-3">Create your vendor account to start managing hospital diets</p>
          <form (submit)="register($event)">
            <h6 class="text-muted mb-2"><i class="bi bi-building me-1"></i>Company Details</h6>
            <div class="mb-3">
              <label class="form-label">Vendor / Company Name *</label>
              <input class="form-control" type="text" [(ngModel)]="form.vendorName" name="vendorName" required placeholder="e.g., Fresh Foods Pvt Ltd" />
            </div>
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label">Contact Email *</label>
                <input class="form-control" type="email" [(ngModel)]="form.contactEmail" name="contactEmail" required placeholder="contact@company.com" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Contact Phone</label>
                <input class="form-control" type="tel" [(ngModel)]="form.contactPhone" name="contactPhone" placeholder="+91 98765 43210" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Business Address</label>
              <input class="form-control" type="text" [(ngModel)]="form.address" name="address" placeholder="Full address" />
            </div>

            <hr class="my-3">
            <h6 class="text-muted mb-2"><i class="bi bi-person me-1"></i>Admin Account</h6>
            <div class="mb-3">
              <label class="form-label">Admin Name *</label>
              <input class="form-control" type="text" [(ngModel)]="form.adminName" name="adminName" required placeholder="Your full name" />
            </div>
            <div class="mb-3">
              <label class="form-label">Admin Email *</label>
              <input class="form-control" type="email" [(ngModel)]="form.adminEmail" name="adminEmail" required placeholder="you@company.com" />
            </div>
            <div class="mb-3">
              <label class="form-label">Password *</label>
              <input class="form-control" type="password" [(ngModel)]="form.adminPassword" name="adminPassword" required placeholder="Min 6 characters" minlength="6" />
            </div>

            <div *ngIf="error" class="alert alert-danger py-2 small">{{ error }}</div>

            <div class="d-grid">
              <button class="btn btn-primary btn-lg" type="submit" [disabled]="loading">
                <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
                {{ loading ? 'Submitting…' : 'Register Vendor' }}
              </button>
            </div>
          </form>
          <div class="mt-3 text-center small text-muted">
            Already have an account? <a routerLink="/login" class="fw-semibold" style="color: #0d9488;">Sign in</a>
          </div>
        </ng-container>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #0d9488 0%, #10b981 50%, #34d399 100%);
      position: relative;
    }
    :host::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 80%, rgba(255,255,255,.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255,255,255,.08) 0%, transparent 50%);
      pointer-events: none;
    }
    .login-card {
      background: rgba(255,255,255,.95);
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 60px rgba(0,0,0,.15);
      border: 1px solid rgba(255,255,255,.5);
      border-radius: 16px;
    }
    .login-hero .form-label { font-weight: 500; font-size: .8125rem; }
    .login-hero .btn-primary {
      background: linear-gradient(135deg, #0d9488, #10b981);
      border: none;
      box-shadow: 0 4px 16px rgba(13,148,136,.3);
      padding: .65rem;
      font-weight: 600;
    }
    .login-hero .btn-primary:hover {
      box-shadow: 0 6px 24px rgba(13,148,136,.4);
      transform: translateY(-1px);
    }
    .login-hero .form-control {
      border-radius: 8px;
      padding: .6rem .9rem;
    }
  `]
})
export class VendorRegisterComponent {
  form = {
    vendorName: '', contactEmail: '', contactPhone: '', address: '',
    adminName: '', adminEmail: '', adminPassword: ''
  };
  error = '';
  loading = false;
  submitted = false;

  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}

  register(e: Event) {
    e.preventDefault();
    if (!this.form.vendorName || !this.form.contactEmail || !this.form.adminName || !this.form.adminEmail || !this.form.adminPassword) {
      this.error = 'Please fill in all required fields';
      return;
    }
    this.error = '';
    this.loading = true;
    this.api.post('/vendors/register', this.form).subscribe((res: any) => {
      this.submitted = true;
      this.loading = false;
      this.toast.success('Registration submitted successfully!');
    }, err => {
      this.error = err?.error?.message || 'Registration failed';
      this.loading = false;
    });
  }
}
