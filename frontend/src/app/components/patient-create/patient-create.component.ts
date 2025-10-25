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
  model: any = { name: '', phone: '', inDate: '', inTime: '', dischargeDate: '', dischargeTime: '', roomType: 'Ward', roomNo: '', bed: '', diet: undefined, dietNote: '', status: 'in_patient', transactionType: 'cash', age: null, sex: 'male', feedback: '', allergies: [], notes: '' };
  serverErrors: any[] = [];
  fieldErrors: any = {};
  dietOptions: any[] = [];
  dietLoadError: string | null = null;
  dietsLoading = false;
  saving = false;
  // 12-hour time UI state
  hours12: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  minutes: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  ampmOptions: ('AM'|'PM')[] = ['AM','PM'];
  inHour: string = '';
  inMinute: string = '';
  inAmpm: 'AM' | 'PM' = 'AM';
  dischargeHour: string = '';
  dischargeMinute: string = '';
  dischargeAmpm: 'AM' | 'PM' = 'AM';

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() { this.loadDiets(); }

  loadDiets() {
    this.dietsLoading = true;
    this.dietLoadError = null;
    this.api.get('/diets').subscribe((res: any) => {
      this.dietOptions = Array.isArray(res) ? res : [];
      this.dietsLoading = false;
    }, err => {
      console.error('failed to load diets', err);
      this.dietOptions = [];
      this.dietsLoading = false;
      this.dietLoadError = err?.error?.message || (err?.message || 'Failed to load diets');
    });
  }

  save(e: Event) {
    e.preventDefault();
    this.serverErrors = [];
    this.fieldErrors = {};
    if (!this.clientValidate()) return;
    // removed recurringDetails parsing
    // convert 12h selections to 24h HH:MM strings
    const to24h = (hh: string, mm: string, ap: 'AM'|'PM'): string | '' => {
      if (!hh && !mm && !ap) return '';
      if (!hh || !mm) return '';
      let h = parseInt(hh, 10);
      const m = parseInt(mm, 10);
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const H = String(h).padStart(2, '0');
      const M = String(m).padStart(2, '0');
      return `${H}:${M}`;
    };
    this.model.inTime = to24h(this.inHour, this.inMinute, this.inAmpm) || '';
    this.model.dischargeTime = to24h(this.dischargeHour, this.dischargeMinute, this.dischargeAmpm) || '';

    this.saving = true;
    this.api.post('/patients', this.model).subscribe((res:any) => { this.toast.success('Patient created'); this.router.navigate(['/patients']); this.saving = false; }, err => {
      if (err?.status === 400 && err.error?.errors) {
        // expect structured errors { field?, message }
        this.serverErrors = Array.isArray(err.error.errors) ? err.error.errors : [{ message: String(err.error.errors) }];
        this.mapStructuredErrors(this.serverErrors);
      } else {
        this.toast.error('Create failed');
        console.error(err);
      }
      this.saving = false;
    });
  }

  clientValidate(): boolean {
    const fe: any = {};
    if (!this.model.name || String(this.model.name).trim().length === 0) fe.name = 'Name is required';
    if (!this.model.phone || String(this.model.phone).trim().length === 0) {
      fe.phone = 'Phone is required';
    } else {
      const phone = String(this.model.phone).trim();
      const phoneRe = /^[0-9+()\-\s]{5,20}$/;
      if (!phoneRe.test(phone)) fe.phone = 'Phone format is invalid';
    }
    // required age
    if (this.model.age === null || this.model.age === undefined || this.model.age === '') {
      fe.age = 'Age is required';
    } else {
      const age = Number(this.model.age);
      if (Number.isNaN(age) || age < 0 || age > 150) fe.age = 'Age is invalid';
    }
    // required sex
    if (!this.model.sex) fe.sex = 'Sex is required';
    // required inDate
    if (!this.model.inDate) fe.inDate = 'In date is required';
    // Time validation helpers
    const vTimeRequired = (hh: string, mm: string): boolean => {
      const filled = !!hh || !!mm; // AM/PM always set by default
      if (!filled) return false; // required
      if (!hh || !mm) return false;
      const h = parseInt(hh, 10), m = parseInt(mm, 10);
      return h >= 1 && h <= 12 && m >= 0 && m <= 59;
    };
    const vTimeOptional = (hh: string, mm: string): boolean => {
      const filled = !!hh || !!mm;
      if (!filled) return true; // optional field can be empty
      if (!hh || !mm) return false;
      const h = parseInt(hh, 10), m = parseInt(mm, 10);
      return h >= 1 && h <= 12 && m >= 0 && m <= 59;
    };
    if (!vTimeRequired(this.inHour, this.inMinute)) fe.inTime = 'Please select hour and minute';
    if (!vTimeOptional(this.dischargeHour, this.dischargeMinute)) fe.dischargeTime = 'Please select hour and minute';
    // required room type & bed
    if (!this.model.roomType) fe.roomType = 'Room type is required';
    if (!this.model.bed) fe.bed = 'Bed is required';
    // required patient status & transaction type
    if (!this.model.status) fe.status = 'Patient status is required';
    if (!this.model.transactionType) fe.transactionType = 'Transaction type is required';
    // removed totalBill and dailyBill validation
    if (this.model.diet) {
      const allowed = this.dietOptions.map(d => d.name);
      if (!allowed.includes(this.model.diet)) fe.diet = 'Diet is invalid';
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
