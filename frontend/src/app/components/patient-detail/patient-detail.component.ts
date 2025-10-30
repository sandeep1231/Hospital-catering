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
  assignments: any[] = [];
  filtered: any[] = [];
  filterDays: number | 'all' = 'all';
  newAssign: any = { date: '', fromTime: '', toTime: '', diet: undefined, note: '', price: 0 };
  bulk: any = { startDate: '', days: 0, untilDischarge: false, diet: undefined, note: '', overwriteExisting: false };
  changeDiet: any = { startDate: '', endDate: '', untilDischarge: true, newDiet: undefined, note: '' };
  serverErrors: any[] = [];
  fieldErrors: any = {};
  // Active diets for selection in change-diet and assignments
  dietOptionsActive: any[] = [];
  // Diet options for the patient diet select: active diets + current patient's diet if inactive
  dietOptionsPatient: any[] = [];
  role: string | null = null;
  // loading flags
  isSaving: boolean = false;
  changeDietLoading: boolean = false;
  deleting: Record<string, boolean> = {};
  // 12-hour time UI state for edit form
  hours12: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  minutes: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  ampmOptions: ('AM'|'PM')[] = ['AM','PM'];
  inHour: string = '';
  inMinute: string = '';
  inAmpm: 'AM' | 'PM' = 'AM';
  dischargeHour: string = '';
  dischargeMinute: string = '';
  dischargeAmpm: 'AM' | 'PM' = 'AM';

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router, private toast: ToastService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.role = this.api.getUserRole();
    if (!id) return;
    this.api.get('/patients/' + id).subscribe((res: any) => { this.patient = this.normalizeDates(res); this.prefillTimes(); this.buildPatientDietOptions(); }, (err) => {
      console.error(err);
      this.serverErrors = [{ message: err?.error?.message || 'Failed to load patient' }];
    });
    this.loadAssignments();
    this.loadDiets();
  }

  private normalizeDates(p: any) {
    if (!p) return p;
    const toYmd = (v: any): string => {
      if (!v) return '';
      try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      } catch { return ''; }
    };
    // Ensure date inputs receive yyyy-MM-dd
    if (p.inDate) p.inDate = toYmd(p.inDate);
    if (p.dischargeDate) p.dischargeDate = toYmd(p.dischargeDate);
    return p;
  }

  private prefillTimes() {
    // parse HH:MM -> 12h
    const parse24 = (t?: string) => {
      if (!t) return { hh: '', mm: '', ap: 'AM' as 'AM'|'PM' };
      const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(String(t));
      if (!m) return { hh: '', mm: '', ap: 'AM' as 'AM'|'PM' };
      let H = parseInt(m[1], 10);
      const M = m[2];
      let ap: 'AM'|'PM' = 'AM';
      if (H === 0) { H = 12; ap = 'AM'; }
      else if (H === 12) { ap = 'PM'; }
      else if (H > 12) { H -= 12; ap = 'PM'; }
      return { hh: String(H).padStart(2, '0'), mm: M, ap };
    };
    const i = parse24(this.patient?.inTime);
    this.inHour = i.hh; this.inMinute = i.mm; this.inAmpm = i.ap;
    const d = parse24(this.patient?.dischargeTime);
    this.dischargeHour = d.hh; this.dischargeMinute = d.mm; this.dischargeAmpm = d.ap;
  }

  loadAssignments() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
  this.api.get(`/diet-assignments/patient/${id}`).subscribe((res: any) => {
      const arr = Array.isArray(res) ? res : [];
      // sort by date desc, then createdAt desc if available
      this.assignments = arr.sort((a,b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cb - ca;
      });
      // Always display the latest assigned diet (irrespective of status) in the form view
      const latest = this.assignments[0];
      if (latest && this.patient) {
        this.patient.diet = latest.diet;
        // optionally reflect note
        if (latest.note !== undefined) this.patient.dietNote = latest.note;
      }
      this.applyFilter();
  }, (err) => { console.error(err); this.toast.error('Failed to load diet assignments'); });
  }

  setFilter(days: number | 'all') { this.filterDays = days; this.applyFilter(); }

  private applyFilter() {
    if (this.filterDays === 'all') { this.filtered = this.assignments.slice(); return; }
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - Number(this.filterDays) + 1);
    this.filtered = this.assignments.filter(a => {
      const d = new Date(a.date);
      return d >= from && d <= now;
    });
  }

  loadDiets() {
    this.api.get('/diets').subscribe((res:any) => {
      const list = Array.isArray(res) ? res : [];
      // Only active diets for selection lists
      this.dietOptionsActive = list.filter((d: any) => d && d.active === true);
      this.buildPatientDietOptions();
    }, err => { console.error('failed to load diets', err); });
  }

  private buildPatientDietOptions() {
    // Build patient diet dropdown options: active diets plus the patient's current diet if it's inactive
    const active = Array.isArray(this.dietOptionsActive) ? this.dietOptionsActive : [];
    const current = this.patient?.diet ? String(this.patient.diet) : '';
    const hasCurrentInActive = current ? active.some((d: any) => d?.name === current) : false;
    if (current && !hasCurrentInActive) {
      // Append the current diet so it's visible in the select, without making all inactive diets selectable elsewhere
      this.dietOptionsPatient = [...active, { name: current, active: false }];
    } else {
      this.dietOptionsPatient = [...active];
    }
  }

  back() { this.router.navigate(['/patients']); }

  save(e: Event) {
    e.preventDefault();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.serverErrors = [];
    this.fieldErrors = {};
    // Dietician: only feedback is editable, short-circuit to feedback-only endpoint
    if (this.role === 'dietician') {
      const body = { feedback: this.patient?.feedback || '' };
      this.isSaving = true;
      this.api.put('/patients/' + id + '/feedback', body).subscribe((res:any) => {
        this.toast.success('Feedback updated');
        this.isSaving = false;
      }, err => {
        this.toast.error('Save failed'); console.error(err); this.isSaving = false;
      });
      return;
    }
  if (!this.clientValidate()) { this.toast.error('Please correct the highlighted fields'); return; }
    // Additional discharge validation
    const status = String(this.patient?.status || '').trim();
    const hasDischargeDate = !!this.patient?.dischargeDate;
    const hasDischargeTime = !!(this.dischargeHour || this.dischargeMinute);
    const dischargeFilled = hasDischargeDate || hasDischargeTime;
    // If status set to discharged, require both date and time
    if (status === 'discharged') {
      if (!hasDischargeDate || !hasDischargeTime) {
        this.toast.error('Please provide both Discharge Date and Discharge Time for discharged patients');
        return;
      }
    }
    // If discharge date/time is provided but status is not discharged, block with actionable error
    if (dischargeFilled && status !== 'discharged') {
      this.toast.error('Discharge Date/Time entered: set Status to Discharged to continue');
      return;
    }
    this.isSaving = true;
    // convert 12h UI back to 24h for API
    const to24h = (hh: string, mm: string, ap: 'AM'|'PM'): string | '' => {
      if (!hh && !mm) return '';
      if (!hh || !mm) return '';
      let h = parseInt(hh, 10);
      const m = parseInt(mm, 10);
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const H = String(h).padStart(2, '0');
      const M = String(m).padStart(2, '0');
      return `${H}:${M}`;
    };
    this.patient.inTime = to24h(this.inHour, this.inMinute, this.inAmpm) || '';
    this.patient.dischargeTime = to24h(this.dischargeHour, this.dischargeMinute, this.dischargeAmpm) || '';
    // Ensure date fields are in yyyy-MM-dd before sending
    const fixDate = (v: any) => {
      if (!v) return undefined;
      // if it's already yyyy-MM-dd, return as-is
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const d = new Date(v);
      if (isNaN(d.getTime())) return undefined;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    this.patient.inDate = fixDate(this.patient.inDate) || undefined;
    this.patient.dischargeDate = fixDate(this.patient.dischargeDate) || undefined;
    this.api.put('/patients/' + id, this.patient).subscribe((res:any) => {
      const wasDischarged = status === 'discharged';
      this.toast.success(wasDischarged ? 'Patient discharged successfully' : 'Patient updated successfully');
      this.patient = res; this.isSaving = false; 
      // refresh assignments so UI shows updated latest diet
      this.loadAssignments();
    }, err => {
      if (err?.status === 400 && err.error?.errors) {
        this.serverErrors = Array.isArray(err.error.errors) ? err.error.errors : [{ message: String(err.error.errors) }];
        this.mapStructuredErrors(this.serverErrors);
        this.toast.error('Please correct the highlighted fields');
      } else {
        this.toast.error(err?.error?.message || 'Failed to update patient');
        console.error(err);
      }
      this.isSaving = false;
    });
  }

  addAssignment() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const payload = { patientId: id, ...this.newAssign };
    this.api.post('/diet-assignments', payload).subscribe(() => { this.toast.success('Diet assigned'); this.newAssign = { date: '', fromTime: '', toTime: '', diet: undefined, note: '', price: 0 }; this.loadAssignments(); }, err => {
      this.toast.error(err?.error?.message || 'Diet assign failed'); console.error(err);
    });
  }

  runBulk() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const payload = { patientId: id, ...this.bulk };
    this.api.post('/diet-assignments/bulk', payload).subscribe((res:any) => {
      this.toast.success(`Bulk assign done (${res?.count || 0})`);
      // reload to reflect multiple same-day assignments
      this.loadAssignments();
    }, err => { this.toast.error(err?.error?.message || 'Bulk assign failed'); console.error(err); });
  }

  runChangeDiet() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const payload = { patientId: id, ...this.changeDiet };
    this.changeDietLoading = true;
    this.api.post('/diet-assignments/change', payload).subscribe((res:any) => {
      this.toast.success(`Diet changed (${res?.count || 0})`);
      // reload to reflect per-day new assignments created by change
      this.loadAssignments();
      // clear form
      this.changeDiet = { startDate: '', endDate: '', untilDischarge: true, newDiet: undefined, note: '' };
      this.changeDietLoading = false;
    }, err => { this.toast.error(err?.error?.message || 'Change diet failed'); console.error(err); this.changeDietLoading = false; });
  }

  markDelivered(a: any) {
  this.api.post(`/diet-assignments/${a._id}/deliver`, {}).subscribe((res:any) => { this.toast.success('Marked delivered'); a.status = res.status; a.deliveredAt = res.deliveredAt; }, err => { this.toast.error(err?.error?.message || 'Failed to mark delivered'); console.error(err); });
  }

  deleteAssignment(a: any) {
    if (!a || a.status !== 'pending') return;
    const ok = confirm('Delete this pending assignment?');
    if (!ok) return;
    this.deleting[a._id] = true;
    this.api.delete(`/diet-assignments/${a._id}`).subscribe(() => {
      this.toast.success('Diet assignment deleted');
      this.loadAssignments();
      this.deleting[a._id] = false;
    }, err => { this.toast.error(err?.error?.message || 'Diet delete failed'); console.error(err); this.deleting[a._id] = false; });
  }

  reset() { this.ngOnInit(); }

  clientValidate(): boolean {
    const fe: any = {};
    if (!this.patient.name || String(this.patient.name).trim().length === 0) fe.name = 'Name is required';
    if (!this.patient.phone || String(this.patient.phone).trim().length === 0) {
      fe.phone = 'Phone is required';
    } else {
      const phone = String(this.patient.phone).trim();
      const phoneRe = /^[0-9+()\-\s]{5,20}$/;
      if (!phoneRe.test(phone)) fe.phone = 'Phone format is invalid';
    }
    // validate 12h selectors: inTime required, dischargeTime optional
    const vTimeRequired = (hh: string, mm: string): boolean => {
      const filled = !!hh || !!mm;
      if (!filled) return false; // required
      if (!hh || !mm) return false;
      const h = parseInt(hh, 10), m = parseInt(mm, 10);
      return h >= 1 && h <= 12 && m >= 0 && m <= 59;
    };
    const vTimeOptional = (hh: string, mm: string): boolean => {
      const filled = !!hh || !!mm;
      if (!filled) return true; // optional
      if (!hh || !mm) return false;
      const h = parseInt(hh, 10), m = parseInt(mm, 10);
      return h >= 1 && h <= 12 && m >= 0 && m <= 59;
    };
    if (!vTimeRequired(this.inHour, this.inMinute)) fe.inTime = 'Please select hour and minute';
    if (!vTimeOptional(this.dischargeHour, this.dischargeMinute)) fe.dischargeTime = 'Please select hour and minute';
    // required age
    if (this.patient.age === null || this.patient.age === undefined || this.patient.age === '') {
      fe.age = 'Age is required';
    } else {
      const age = Number(this.patient.age);
      if (Number.isNaN(age) || age < 0 || age > 150) fe.age = 'Age is invalid';
    }
    // required sex
    if (!this.patient.sex) fe.sex = 'Sex is required';
    // required inDate
    if (!this.patient.inDate) fe.inDate = 'In date is required';
    // required roomType & bed
    if (!this.patient.roomType) fe.roomType = 'Room type is required';
    if (!this.patient.bed) fe.bed = 'Bed is required';
    // required status & transactionType
    if (!this.patient.status) fe.status = 'Patient status is required';
    if (!this.patient.transactionType) fe.transactionType = 'Transaction type is required';
    // Discharge cross-field: if status is discharged, require both discharge date and discharge time
    if (this.patient.status === 'discharged') {
      const tFilled = !!(this.dischargeHour || this.dischargeMinute);
      if (!this.patient.dischargeDate) fe.dischargeDate = 'Discharge date is required when status is Discharged';
      if (!tFilled) fe.dischargeTime = 'Discharge time is required when status is Discharged';
    }
    // If discharge date/time provided but status not discharged, flag
    const hasDDate = !!this.patient.dischargeDate;
    const hasDTime = !!(this.dischargeHour || this.dischargeMinute);
    if ((hasDDate || hasDTime) && this.patient.status !== 'discharged') {
      fe.status = 'Set status to Discharged when discharge date/time is provided';
    }
    // removed legacy billing validations
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

  canEditPatient(): boolean {
    const userRole = this.role || this.api.getUserRole();
    if (!this.patient) return false;
    // Admin and diet-supervisor can edit; dietician cannot
    return userRole === 'admin' || userRole === 'diet-supervisor';
  }

  isDisabled(field: string): boolean {
    // Dietician: only feedback is editable
    if (this.role === 'dietician') {
      if (field === 'feedback') return false; // allow editing feedback
      return true; // disable everything else
    }
    // Others follow canEditPatient gate
    return !this.canEditPatient();
  }

  canSubmit(): boolean {
    // Dietician can submit (to update feedback only). Others based on canEditPatient
    if (this.role === 'dietician') return true;
    return this.canEditPatient();

}

}
