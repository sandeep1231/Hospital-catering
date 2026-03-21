import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sa-hospitals',
  template: `
  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1"><i class="bi bi-hospital me-2" style="color: var(--uf-primary);"></i>Hospitals Management</h4>
        <div class="text-muted small">Manage all hospitals on the platform</div>
      </div>
      <button class="btn btn-primary" (click)="showCreate = !showCreate"><i class="bi bi-plus-lg me-1"></i>Add Hospital</button>
    </div>

    <!-- Create form -->
    <div class="card mb-4" *ngIf="showCreate">
      <div class="card-body">
        <h6 class="fw-bold mb-3">Create New Hospital</h6>
        <form (submit)="createHospital($event)">
          <div class="row g-3">
            <div class="col-md-5">
              <input class="form-control" [(ngModel)]="newHospital.name" name="name" placeholder="Hospital name *" required />
            </div>
            <div class="col-md-5">
              <input class="form-control" [(ngModel)]="newHospital.address" name="address" placeholder="Address" />
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100" type="submit" [disabled]="creating">
                <span *ngIf="creating" class="spinner-border spinner-border-sm me-1"></span>Create
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <!-- Filter -->
    <div class="mb-3" *ngIf="!loading">
      <ul class="nav nav-pills">
        <li class="nav-item"><a class="nav-link" [class.active]="filter === 'all'" (click)="filter='all'" role="button">All ({{ hospitals.length }})</a></li>
        <li class="nav-item"><a class="nav-link" [class.active]="filter === 'assigned'" (click)="filter='assigned'" role="button">Assigned</a></li>
        <li class="nav-item"><a class="nav-link" [class.active]="filter === 'unassigned'" (click)="filter='unassigned'" role="button">Unassigned</a></li>
      </ul>
    </div>

    <div class="card" *ngIf="!loading && filteredHospitals.length > 0">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr><th>Hospital Name</th><th>Address</th><th>Assigned Vendor</th><th>Created</th><th class="text-end">Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of filteredHospitals">
              <ng-container *ngIf="editingId !== h._id">
                <td class="fw-semibold">{{ h.name }}</td>
                <td class="text-muted small">{{ h.address }}</td>
              </ng-container>
              <ng-container *ngIf="editingId === h._id">
                <td><input class="form-control form-control-sm" [(ngModel)]="editForm.name" name="ename" /></td>
                <td><input class="form-control form-control-sm" [(ngModel)]="editForm.address" name="eaddr" /></td>
              </ng-container>
              <td>
                <span *ngIf="h.assignedVendor" class="badge bg-success">
                  <i class="bi bi-shop me-1"></i>{{ h.assignedVendor.name }}
                </span>
                <span *ngIf="!h.assignedVendor" class="badge bg-light text-muted">Unassigned</span>
              </td>
              <td class="small text-muted">{{ h.createdAt | date:'mediumDate' }}</td>
              <td class="text-end">
                <ng-container *ngIf="editingId !== h._id">
                  <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" (click)="startEdit(h)"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm btn-outline-danger" title="Delete" (click)="confirmDelete(h)"><i class="bi bi-trash"></i></button>
                </ng-container>
                <ng-container *ngIf="editingId === h._id">
                  <button class="btn btn-sm btn-success me-1" (click)="saveEdit(h)" [disabled]="saving"><i class="bi bi-check-lg"></i></button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="cancelEdit()"><i class="bi bi-x-lg"></i></button>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div *ngIf="deleteTarget" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="z-index:1050;background:rgba(0,0,0,.4)" (click)="deleteTarget=null">
      <div class="card p-4" style="max-width:400px;width:100%" (click)="$event.stopPropagation()">
        <h5 class="fw-bold mb-2">Delete Hospital</h5>
        <p class="text-muted">Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>? This cannot be undone.</p>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-sm btn-outline-secondary" (click)="deleteTarget=null">Cancel</button>
          <button class="btn btn-sm btn-danger" (click)="deleteHospital()" [disabled]="saving">Delete</button>
        </div>
      </div>
    </div>

    <div *ngIf="!loading && filteredHospitals.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-hospital" style="font-size: 3rem; opacity: .3;"></i>
      <p class="mt-2">No hospitals found</p>
    </div>
  </div>
  `,
  styles: [`
    .nav-pills .nav-link { cursor: pointer; }
    .nav-pills .nav-link.active { background: var(--uf-primary); }
  `]
})
export class SAHospitalsComponent implements OnInit {
  loading = true;
  hospitals: any[] = [];
  filter = 'all';
  showCreate = false;
  creating = false;
  newHospital = { name: '', address: '' };
  editingId: string | null = null;
  editForm = { name: '', address: '' };
  saving = false;
  deleteTarget: any = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadHospitals(); }

  loadHospitals() {
    this.loading = true;
    this.api.get('/super-admin/hospitals').subscribe((res: any) => {
      this.hospitals = res || [];
      this.loading = false;
    }, () => { this.loading = false; });
  }

  get filteredHospitals() {
    if (this.filter === 'assigned') return this.hospitals.filter(h => h.assignedVendor);
    if (this.filter === 'unassigned') return this.hospitals.filter(h => !h.assignedVendor);
    return this.hospitals;
  }

  createHospital(e: Event) {
    e.preventDefault();
    if (!this.newHospital.name) return;
    this.creating = true;
    this.api.post('/super-admin/hospitals', this.newHospital).subscribe(() => {
      this.toast.success('Hospital created');
      this.newHospital = { name: '', address: '' };
      this.showCreate = false;
      this.creating = false;
      this.loadHospitals();
    }, (err: any) => {
      this.toast.error(err?.error?.message || 'Failed');
      this.creating = false;
    });
  }

  startEdit(h: any) {
    this.editingId = h._id;
    this.editForm = { name: h.name, address: h.address || '' };
  }

  cancelEdit() { this.editingId = null; }

  saveEdit(h: any) {
    if (!this.editForm.name) return;
    this.saving = true;
    this.api.put('/hospitals/' + h._id, this.editForm).subscribe(() => {
      this.toast.success('Hospital updated');
      this.editingId = null;
      this.saving = false;
      this.loadHospitals();
    }, (err: any) => {
      this.toast.error(err?.error?.message || 'Failed');
      this.saving = false;
    });
  }

  confirmDelete(h: any) { this.deleteTarget = h; }

  deleteHospital() {
    this.saving = true;
    this.api.delete('/hospitals/' + this.deleteTarget._id).subscribe(() => {
      this.toast.success('Hospital deleted');
      this.deleteTarget = null;
      this.saving = false;
      this.loadHospitals();
    }, (err: any) => {
      this.toast.error(err?.error?.message || 'Failed');
      this.deleteTarget = null;
      this.saving = false;
    });
  }
}
