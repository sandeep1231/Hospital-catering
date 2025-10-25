import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-admin-diets', templateUrl: './admin-diets.component.html' })
export class AdminDietsComponent implements OnInit {
  diets: any[] = [];
  loading = false;
  editing: any = null;
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load() { this.loading = true; this.api.get('/diets').subscribe((res:any) => { this.diets = res; this.loading = false; }, err => { console.error(err); this.loading = false; }); }
  newDiet() { this.editing = { name: '', defaultPrice: 0, active: true }; }
  edit(d:any) { this.editing = { ...d }; }
  cancel() { this.editing = null; }
  save() {
    if (!this.editing) return;
    const payload = { name: this.editing.name, defaultPrice: Number(this.editing.defaultPrice||0), active: !!this.editing.active };
    if (this.editing._id) {
      this.api.put(`/diets/${this.editing._id}`, payload).subscribe(() => { this.toast.success('Saved'); this.editing = null; this.load(); }, err => { this.toast.error('Save failed'); console.error(err); });
    } else {
      this.api.post('/diets', payload).subscribe(() => { this.toast.success('Created'); this.editing = null; this.load(); }, err => { this.toast.error('Create failed'); console.error(err); });
    }
  }
  remove(d:any) { if (!confirm('Delete diet?')) return; this.api.delete(`/diets/${d._id}`).subscribe(() => { this.toast.success('Deleted'); this.load(); }, err => { this.toast.error('Delete failed'); console.error(err); }); }
}
