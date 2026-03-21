import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-vendor-hospitals',
  template: `
    <div class="container py-4">
      <h2 class="fw-bold mb-4"><i class="bi bi-hospital me-2"></i>Hospitals</h2>

      <ul class="nav nav-pills mb-4">
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab === 'my'" (click)="tab = 'my'" role="button">My Hospitals</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab === 'available'" (click)="tab = 'available'; loadAvailable()" role="button">Available Hospitals</a>
        </li>
      </ul>

      <!-- My Hospitals Tab -->
      <div *ngIf="tab === 'my'">
        <div class="table-responsive" *ngIf="myHospitals.length; else noMy">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>Hospital Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Requested At</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of myHospitals">
                <td class="fw-semibold">{{ h.hospitalId?.name || '—' }}</td>
                <td>{{ h.hospitalId?.address || '—' }}</td>
                <td>
                  <span class="badge" [ngClass]="statusBadge(h.status)">{{ h.status }}</span>
                </td>
                <td>{{ h.createdAt | date:'medium' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noMy>
          <div class="text-center text-muted py-5">
            <i class="bi bi-hospital fs-1 d-block mb-2"></i>
            No hospitals assigned yet. Switch to the <strong>Available</strong> tab to request one.
          </div>
        </ng-template>
      </div>

      <!-- Available Hospitals Tab -->
      <div *ngIf="tab === 'available'">
        <div class="table-responsive" *ngIf="availableHospitals.length; else noAvail">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>Hospital Name</th>
                <th>Address</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of availableHospitals">
                <td class="fw-semibold">{{ h.name }}</td>
                <td>{{ h.address || '—' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" (click)="requestHospital(h._id)" [disabled]="requesting === h._id">
                    <span *ngIf="requesting === h._id" class="spinner-border spinner-border-sm me-1"></span>
                    <i class="bi bi-send me-1" *ngIf="requesting !== h._id"></i>Request
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noAvail>
          <div class="text-center text-muted py-5">
            <i class="bi bi-check-circle fs-1 d-block mb-2"></i>
            No available hospitals at the moment.
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class VendorHospitalsComponent implements OnInit {
  tab: 'my' | 'available' = 'my';
  myHospitals: any[] = [];
  availableHospitals: any[] = [];
  requesting: string | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadMy();
  }

  loadMy() {
    this.api.get('/vendor-hospitals/my-hospitals').subscribe({
      next: (res: any) => this.myHospitals = res,
      error: () => this.toast.error('Failed to load hospitals')
    });
  }

  loadAvailable() {
    this.api.get('/hospitals/available').subscribe({
      next: (res: any) => this.availableHospitals = res,
      error: () => this.toast.error('Failed to load available hospitals')
    });
  }

  requestHospital(hospitalId: string) {
    this.requesting = hospitalId;
    this.api.post('/vendor-hospitals/request', { hospitalId }).subscribe({
      next: () => {
        this.toast.success('Hospital requested successfully');
        this.requesting = null;
        this.loadMy();
        this.loadAvailable();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Request failed');
        this.requesting = null;
      }
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'requested': return 'bg-warning text-dark';
      case 'rejected': return 'bg-danger';
      case 'revoked': return 'bg-dark';
      default: return 'bg-secondary';
    }
  }
}
