import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css']
})
export class PatientDetailComponent implements OnInit {
  patient: any = null;
  serverErrors: any[] = [];
  fieldErrors: any = {};
  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router, private toast: ToastService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get('/patients/' + id).subscribe((res: any) => this.patient = res, console.error);
  }

  back() { this.router.navigate(['/patients']); }

  save(e: Event) {
    e.preventDefault();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.serverErrors = [];
    this.fieldErrors = {};
    if (!this.clientValidate()) return;
    this.api.put('/patients/' + id, this.patient).subscribe((res:any) => { this.toast.success('Saved'); this.patient = res; }, err => {
      if (err?.status === 400 && err.error?.errors) {
        this.serverErrors = Array.isArray(err.error.errors) ? err.error.errors : [{ message: String(err.error.errors) }];
        this.mapStructuredErrors(this.serverErrors);
      } else {
        this.toast.error('Save failed');
        console.error(err);
      }
    });
  }

  reset() { this.ngOnInit(); }

  clientValidate(): boolean {
    const fe: any = {};
    if (!this.patient.name || String(this.patient.name).trim().length === 0) fe.name = 'Name is required';
    if (this.patient.phone) {
      const phone = String(this.patient.phone).trim();
      const phoneRe = /^[0-9+()\-\s]{5,20}$/;
      if (!phoneRe.test(phone)) fe.phone = 'Phone format is invalid';
    }
    if (this.patient.inTime) {
      const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRe.test(this.patient.inTime)) fe.inTime = 'Time must be HH:MM';
    }
    if (this.patient.age !== null && this.patient.age !== undefined && this.patient.age !== '') {
      const age = Number(this.patient.age);
      if (Number.isNaN(age) || age < 0 || age > 150) fe.age = 'Age is invalid';
    }
    if (this.patient.totalBill !== undefined) {
      const tb = Number(this.patient.totalBill);
      if (Number.isNaN(tb) || tb < 0) fe.totalBill = 'Total bill is invalid';
    }
    if (this.patient.dailyBill !== undefined) {
      const db = Number(this.patient.dailyBill);
      if (Number.isNaN(db) || db < 0) fe.dailyBill = 'Daily bill is invalid';
    }
    this.fieldErrors = fe;
    return Object.keys(fe).length === 0;
  }

  mapStructuredErrors(errors: any[]) {
    const fe: any = {};
    for (const err of errors) {
      if (err.field) fe[err.field] = err.message; else if (!fe._general) fe._general = err.message;
    }
    this.fieldErrors = { ...this.fieldErrors, ...fe };
  }
}
