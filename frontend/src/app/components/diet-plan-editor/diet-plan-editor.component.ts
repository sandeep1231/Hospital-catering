import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-diet-plan-editor',
  template: `
  <div class="d-flex mb-3">
    <h4 class="me-auto">Diet Plan Editor</h4>
    <button class="btn btn-sm btn-outline-secondary" (click)="reset()">New</button>
  </div>

  <div class="card p-3">
    <form (submit)="save($event)">
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Plan name</label>
          <input class="form-control" [(ngModel)]="model.name" name="name" required />
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label">Patient (optional)</label>
          <select class="form-select" [(ngModel)]="model.patientId" name="patientId">
            <option value="">-- Unassigned --</option>
            <option *ngFor="let p of patients" [value]="p._id">{{p.name}} ({{p.mrn || 'no MRN'}}) — {{p.ward || ''}}/{{p.bed || ''}}</option>
          </select>
          <div class="form-text" *ngIf="model.patientId && selectedPatientMrn() === ''">
            Please set MRN/Patient ID for this patient in their profile before assigning a plan.
          </div>
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Start date</label>
          <input type="date" class="form-control" [(ngModel)]="model.startDate" name="startDate" required />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label">End date</label>
          <input type="date" class="form-control" [(ngModel)]="model.endDate" name="endDate" />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label">Recurrence</label>
          <select class="form-select" [(ngModel)]="model.recurrence" name="recurrence">
            <option value="none">None (single day)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div class="col-12" *ngIf="model.recurrence === 'weekly'">
          <label class="form-label">Repeat on</label>
          <div class="d-flex flex-wrap gap-2">
            <div *ngFor="let d of week; let i = index" class="form-check">
              <input class="form-check-input" type="checkbox" [id]="'day'+i" [checked]="selectedDays.includes(i)" (change)="toggleDay(i)" />
              <label class="form-check-label ms-1" [for]="'day'+i">{{d}}</label>
            </div>
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Meals (check menu items and add notes)</label>
          <div *ngFor="let meal of model.meals; let idx = index" class="card mb-2 p-2">
            <div class="row g-2 align-items-start">
              <div class="col-12 col-md-3">
                <select class="form-select" [(ngModel)]="meal.slot" name="slot{{idx}}">
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div class="col-12 col-md-7">
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex align-items-start" *ngFor="let m of menu">
                    <label class="form-check">
                      <input class="form-check-input" type="checkbox" [checked]="isChecked(meal.items, m._id)" (change)="toggleItemWithNotes(meal, m._id, $any($event.target).checked)" />
                      <span class="ms-2">{{m.name}}</span>
                    </label>
                  </div>
                  <div class="ps-4" *ngFor="let m of menu">
                    <div *ngIf="isChecked(meal.items, m._id)" class="mt-1">
                      <textarea class="form-control form-control-sm" rows="2" placeholder="Notes/instructions for {{m.name}} (optional)" [(ngModel)]="meal.itemNotes[m._id]" name="note{{idx}}{{m._id}}"></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-2 text-end">
                <button type="button" class="btn btn-danger btn-sm" (click)="removeMeal(idx)">Remove</button>
              </div>
            </div>
          </div>

          <div class="mt-2">
            <button type="button" class="btn btn-outline-primary btn-sm" (click)="addMeal()">+ Add meal slot</button>
          </div>
        </div>

        <div class="col-12 text-end">
          <button class="btn btn-secondary me-2" type="button" (click)="reset()">Reset</button>
          <button class="btn btn-primary" type="submit">Save Plan</button>
        </div>
      </div>
    </form>

    <div *ngIf="message" class="alert alert-success mt-3">
      {{message}}
      <a *ngIf="hasOrderLink" [routerLink]="['/orders']" class="ms-2">View orders</a>
    </div>
  </div>
  `
})
export class DietPlanEditorComponent implements OnInit {
  patients: any[] = [];
  menu: any[] = [];
  message = '';
  hasOrderLink = false;

  week = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  selectedDays: number[] = [];

  model: any = {
    name: '',
    patientId: '',
    startDate: this.toDateInput(new Date()),
    endDate: '',
    recurrence: 'weekly',
    // each meal now also tracks itemNotes: { [menuItemId]: string }
    meals: [ { slot: 'breakfast', items: [], itemNotes: {} as Record<string,string> } ]
  };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadPatients();
    this.loadMenu();
  }

  toDateInput(d: Date) { const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}`; }

  async loadPatients() { this.api.get('/patients').subscribe((res:any)=> this.patients = res, console.error); }
  async loadMenu() { this.api.get('/menu').subscribe((res:any)=> this.menu = res, console.error); }

  addMeal() { this.model.meals.push({ slot: 'breakfast', items: [], itemNotes: {} }); }
  removeMeal(i: number) { this.model.meals.splice(i,1); }

  toggleDay(i: number) { const idx = this.selectedDays.indexOf(i); if (idx === -1) this.selectedDays.push(i); else this.selectedDays.splice(idx,1); }

  isChecked(arr: string[], id: string) { return Array.isArray(arr) && arr.includes(id); }
  toggleItem(arr: string[], id: string, checked: boolean) {
    if (!Array.isArray(arr)) return;
    const i = arr.indexOf(id);
    if (checked && i === -1) arr.push(id);
    if (!checked && i !== -1) arr.splice(i,1);
  }
  // track notes when toggling
  toggleItemWithNotes(meal: any, id: string, checked: boolean) {
    this.toggleItem(meal.items, id, checked);
    if (!meal.itemNotes) meal.itemNotes = {};
    if (!checked) delete meal.itemNotes[id];
  }

  buildDays() {
    if (this.model.recurrence === 'weekly') {
      if (this.selectedDays.length === 0) return [ { dayIndex: 0, meals: this.cloneMeals() } ];
      return this.selectedDays.map(d => ({ dayIndex: d, meals: this.cloneMeals() }));
    }
    return [ { dayIndex: 0, meals: this.cloneMeals() } ];
  }

  // convert selected items + notes to [{id, notes}] so backend stores notes
  cloneMeals() { return this.model.meals.map((m:any) => ({
    slot: m.slot,
    items: (Array.isArray(m.items) ? m.items : [m.items].filter(Boolean)).map((id: string) => ({ id, notes: (m.itemNotes||{})[id] || undefined }))
  })); }

  selectedPatientMrn(): string { const p = this.patients.find(x => x._id === this.model.patientId); return p?.mrn ? String(p.mrn) : ''; }

  save(e: Event) {
    e.preventDefault();
    // if a patient is chosen, enforce MRN presence
    if (this.model.patientId && !this.selectedPatientMrn()) { this.toast.error('Please set MRN/Patient ID for the selected patient before saving.'); return; }

    const payload: any = {
      name: this.model.name,
      patientId: this.model.patientId || undefined,
      startDate: this.model.startDate,
      endDate: this.model.endDate || undefined,
      recurrence: this.model.recurrence,
      days: this.buildDays(),
      notes: ''
    };

    this.api.post('/diet-plans', payload).subscribe((res:any) => {
      const created = res?.createdOrder;
      if (created) {
        this.toast.success('Plan saved and today\'s order created.');
        this.message = `Order created for ${new Date(created.date).toLocaleDateString()}.`;
        this.hasOrderLink = true;
      } else {
        this.toast.success('Plan saved');
        this.message = 'Plan saved.';
        this.hasOrderLink = false;
      }
      setTimeout(()=> this.message = '', 4000);
      this.reset(false);
    }, err => { console.error(err); this.toast.error('Save failed'); });
  }

  reset(clearName = true) {
    if (clearName) {
      this.model = { name: '', patientId: '', startDate: this.toDateInput(new Date()), endDate: '', recurrence: 'weekly', meals: [ { slot: 'breakfast', items: [], itemNotes: {} } ] };
      this.selectedDays = [];
    } else {
      this.model.meals = [ { slot: 'breakfast', items: [], itemNotes: {} } ];
      this.selectedDays = [];
    }
    this.hasOrderLink = false;
  }
}
