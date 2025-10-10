import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-patient-create',
  templateUrl: './patient-create.component.html',
  styleUrls: []
})
export class PatientCreateComponent {
  model: any = { name: '', phone: '', inDate: '', inTime: '', roomType: 'Ward', bed: '', diet: '', status: 'in_patient', transactionType: 'cash', age: null, sex: 'male', totalBill: 0, dailyBill: 0, recurringDetails: '', feedback: '', allergies: [], notes: '' };
  serverErrors: any[] = [];
  fieldErrors: any = {};
  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  save(e: Event) {
    e.preventDefault();
    this.serverErrors = [];
    this.fieldErrors = {};
    if (!this.clientValidate()) return;
    // attempt to parse recurringDetails if it's JSON-like
    try {
      if (this.model.recurringDetails && typeof this.model.recurringDetails === 'string') {
        try { this.model.recurringDetails = JSON.parse(this.model.recurringDetails); } catch (e) { /* keep string */ }
      }
    } catch (e) {}

    this.api.post('/patients', this.model).subscribe((res:any) => { this.toast.success('Patient created'); this.router.navigate(['/patients']); }, err => {
      if (err?.status === 400 && err.error?.errors) {
        // expect structured errors { field?, message }
        this.serverErrors = Array.isArray(err.error.errors) ? err.error.errors : [{ message: String(err.error.errors) }];
        this.mapStructuredErrors(this.serverErrors);
      } else {
        this.toast.error('Create failed');
        console.error(err);
      }
    });
  }

  clientValidate(): boolean {
    const fe: any = {};
    if (!this.model.name || String(this.model.name).trim().length === 0) fe.name = 'Name is required';
    if (this.model.phone) {
      const phone = String(this.model.phone).trim();
      const phoneRe = /^[0-9+()\-\s]{5,20}$/;
      if (!phoneRe.test(phone)) fe.phone = 'Phone format is invalid';
    }
    if (this.model.inTime) {
      const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRe.test(this.model.inTime)) fe.inTime = 'Time must be HH:MM';
    }
    if (this.model.age !== null && this.model.age !== undefined && this.model.age !== '') {
      const age = Number(this.model.age);
      if (Number.isNaN(age) || age < 0 || age > 150) fe.age = 'Age is invalid';
    }
    if (this.model.totalBill !== undefined) {
      const tb = Number(this.model.totalBill);
      if (Number.isNaN(tb) || tb < 0) fe.totalBill = 'Total bill is invalid';
    }
    if (this.model.dailyBill !== undefined) {
      const db = Number(this.model.dailyBill);
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

  back() { this.router.navigate(['/patients']); }
}
