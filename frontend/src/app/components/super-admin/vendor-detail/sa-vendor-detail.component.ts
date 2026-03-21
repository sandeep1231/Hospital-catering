import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sa-vendor-detail',
  template: `
  <div class="mt-3">
    <a routerLink="/super-admin/vendors" class="btn btn-sm btn-outline-secondary mb-3"><i class="bi bi-arrow-left me-1"></i>Back to Vendors</a>

    <div *ngIf="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div *ngIf="!loading && vendor">
      <!-- Vendor Info Card -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h4 class="fw-bold mb-1">{{ vendor.name }}</h4>
              <div class="text-muted">{{ vendor.contactEmail }} <span *ngIf="vendor.contactPhone">· {{ vendor.contactPhone }}</span></div>
              <div class="text-muted small" *ngIf="vendor.address">{{ vendor.address }}</div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge fs-6" [ngClass]="statusClass(vendor.status)">{{ vendor.status }}</span>
              <div class="position-relative">
                <button class="btn btn-sm btn-outline-secondary" (click)="statusDropdownOpen = !statusDropdownOpen">
                  Change Status <i class="bi bi-chevron-down ms-1"></i>
                </button>
                <div *ngIf="statusDropdownOpen" class="position-absolute end-0 mt-1 bg-white rounded shadow-sm border py-1" style="z-index:1000;min-width:160px;">
                  <ng-container *ngFor="let s of statusOptions">
                    <a *ngIf="s !== vendor.status" class="d-block px-3 py-2 text-decoration-none text-dark small" style="cursor:pointer;" (mouseenter)="$event.target.style.background='#f8f9fa'" (mouseleave)="$event.target.style.background='transparent'" (click)="changeStatus(s)">
                      <i class="bi bi-circle-fill me-2" [style.color]="dotColor(s)" style="font-size:.5rem;vertical-align:middle;"></i>
                      {{ s.charAt(0).toUpperCase() + s.slice(1) }}
                    </a>
                  </ng-container>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hospitals -->
      <div class="card mb-4">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-hospital" style="color: var(--uf-primary);"></i>
          <h6 class="mb-0">Assigned Hospitals ({{ hospitals.length }})</h6>
        </div>
        <div class="card-body p-0" *ngIf="hospitals.length > 0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Hospital</th><th>Address</th><th>Status</th><th>Approved At</th><th class="text-end">Action</th></tr></thead>
            <tbody>
              <tr *ngFor="let h of hospitals">
                <td>{{ h.hospitalId?.name }}</td>
                <td class="text-muted small">{{ h.hospitalId?.address }}</td>
                <td><span class="badge" [ngClass]="statusClass(h.status)">{{ h.status }}</span></td>
                <td class="small text-muted">{{ h.approvedAt | date:'mediumDate' }}</td>
                <td class="text-end">
                  <button *ngIf="h.status === 'approved'" class="btn btn-sm btn-outline-danger" (click)="revokeHospital(h)" [disabled]="revoking === h._id">
                    <span *ngIf="revoking === h._id" class="spinner-border spinner-border-sm me-1"></span>
                    <i class="bi bi-x-circle me-1" *ngIf="revoking !== h._id"></i>Revoke
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-body text-muted" *ngIf="hospitals.length === 0">No hospitals assigned yet</div>
      </div>

      <!-- Users -->
      <div class="card">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-people" style="color: var(--uf-primary);"></i>
          <h6 class="mb-0">Users ({{ users.length }})</h6>
        </div>
        <div class="card-body p-0" *ngIf="users.length > 0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td>{{ u.name }}</td>
                <td class="small">{{ u.email }}</td>
                <td><span class="badge bg-primary">{{ u.role }}</span></td>
                <td class="small text-muted">{{ u.createdAt | date:'mediumDate' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-body text-muted" *ngIf="users.length === 0">No users</div>
      </div>
    </div>
  </div>
  `
})
export class SAVendorDetailComponent implements OnInit {
  loading = true;
  vendor: any;
  hospitals: any[] = [];
  users: any[] = [];
  statusDropdownOpen = false;
  statusOptions = ['approved', 'suspended', 'rejected'];
  revoking: string | null = null;

  constructor(private api: ApiService, private route: ActivatedRoute, private toast: ToastService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get('/vendors/' + id).subscribe((res: any) => {
      this.vendor = res.vendor;
      this.hospitals = res.hospitals || [];
      this.users = res.users || [];
      this.loading = false;
    }, () => { this.loading = false; });
  }

  changeStatus(status: string) {
    this.statusDropdownOpen = false;
    this.api.patch('/vendors/' + this.vendor._id + '/status', { status }).subscribe((res: any) => {
      this.vendor.status = res.status;
      this.toast.success('Vendor status updated to ' + status);
    }, (err: any) => { this.toast.error(err?.error?.message || 'Failed'); });
  }

  revokeHospital(h: any) {
    if (!confirm(`Revoke hospital "${h.hospitalId?.name}" from this vendor?`)) return;
    this.revoking = h._id;
    this.api.patch('/vendor-hospitals/' + h._id + '/revoke', {}).subscribe({
      next: (res: any) => {
        h.status = 'revoked';
        this.revoking = null;
        this.toast.success('Hospital assignment revoked');
      },
      error: (err: any) => {
        this.revoking = null;
        this.toast.error(err?.error?.message || 'Failed to revoke');
      }
    });
  }

  dotColor(status: string): string {
    switch (status) {
      case 'approved': return '#198754';
      case 'suspended': return '#6c757d';
      case 'rejected': return '#dc3545';
      default: return '#adb5bd';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'rejected': return 'bg-danger';
      case 'suspended': return 'bg-secondary';
      case 'requested': return 'bg-info';
      case 'revoked': return 'bg-dark';
      default: return 'bg-light text-dark';
    }
  }
}
