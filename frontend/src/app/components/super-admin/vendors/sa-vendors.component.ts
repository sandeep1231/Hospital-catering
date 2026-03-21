import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sa-vendors',
  template: `
  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1"><i class="bi bi-shop me-2" style="color: var(--uf-primary);"></i>Vendors Management</h4>
        <div class="text-muted small">Manage all vendor accounts</div>
      </div>
    </div>

    <!-- Status filter tabs -->
    <ul class="nav nav-pills mb-3">
      <li class="nav-item" *ngFor="let tab of tabs">
        <a class="nav-link" [class.active]="activeTab === tab.value" (click)="filterByStatus(tab.value)" role="button">
          {{ tab.label }}
          <span *ngIf="tab.value === 'pending' && pendingCount > 0" class="badge bg-danger ms-1">{{ pendingCount }}</span>
        </a>
      </li>
    </ul>

    <div *ngIf="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div *ngIf="!loading && vendors.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-shop" style="font-size: 3rem; opacity: .3;"></i>
      <p class="mt-2">No vendors found</p>
    </div>

    <div class="card" *ngIf="!loading && vendors.length > 0">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Contact</th>
              <th>Hospitals</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of vendors">
              <td>
                <a [routerLink]="['/super-admin/vendors', v._id]" class="fw-semibold text-decoration-none">{{ v.name }}</a>
              </td>
              <td>
                <div class="small">{{ v.contactEmail }}</div>
                <div class="small text-muted" *ngIf="v.contactPhone">{{ v.contactPhone }}</div>
              </td>
              <td><span class="badge bg-primary">{{ v.hospitalCount }}</span></td>
              <td>
                <span class="badge" [ngClass]="statusClass(v.status)">{{ v.status }}</span>
              </td>
              <td class="small text-muted">{{ v.createdAt | date:'mediumDate' }}</td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-success" *ngIf="v.status === 'pending'" (click)="changeStatus(v, 'approved')" title="Approve">
                    <i class="bi bi-check-lg"></i>
                  </button>
                  <button class="btn btn-outline-danger" *ngIf="v.status === 'pending'" (click)="changeStatus(v, 'rejected')" title="Reject">
                    <i class="bi bi-x-lg"></i>
                  </button>
                  <button class="btn btn-outline-warning" *ngIf="v.status === 'approved'" (click)="changeStatus(v, 'suspended')" title="Suspend">
                    <i class="bi bi-pause-circle"></i>
                  </button>
                  <button class="btn btn-outline-success" *ngIf="v.status === 'suspended'" (click)="changeStatus(v, 'approved')" title="Reactivate">
                    <i class="bi bi-play-circle"></i>
                  </button>
                  <a [routerLink]="['/super-admin/vendors', v._id]" class="btn btn-outline-primary" title="Detail">
                    <i class="bi bi-eye"></i>
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .nav-pills .nav-link { cursor: pointer; }
    .nav-pills .nav-link.active { background: var(--uf-primary); }
  `]
})
export class SAVendorsComponent implements OnInit {
  loading = true;
  vendors: any[] = [];
  activeTab = '';
  pendingCount = 0;
  tabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Suspended', value: 'suspended' }
  ];

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute, private toast: ToastService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['status'] || '';
      this.loadVendors();
    });
  }

  loadVendors() {
    this.loading = true;
    const params: any = {};
    if (this.activeTab) params.status = this.activeTab;
    this.api.get('/vendors', params).subscribe((res: any) => {
      this.vendors = res.vendors || [];
      this.loading = false;
    }, () => { this.loading = false; });
    // Get pending count
    this.api.get('/vendors', { status: 'pending' }).subscribe((res: any) => {
      this.pendingCount = res.total || 0;
    });
  }

  filterByStatus(status: string) {
    this.activeTab = status;
    this.router.navigate([], { queryParams: status ? { status } : {}, queryParamsHandling: '' });
  }

  changeStatus(vendor: any, status: string) {
    this.api.patch('/vendors/' + vendor._id + '/status', { status }).subscribe(() => {
      this.toast.success('Vendor ' + status);
      this.loadVendors();
    }, (err: any) => {
      this.toast.error(err?.error?.message || 'Failed');
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'rejected': return 'bg-danger';
      case 'suspended': return 'bg-secondary';
      default: return 'bg-light text-dark';
    }
  }
}
