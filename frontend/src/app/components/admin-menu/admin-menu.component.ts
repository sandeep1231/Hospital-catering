import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-menu',
  templateUrl: './admin-menu.component.html',
  styleUrls: ['./admin-menu.component.css']
})
export class AdminMenuComponent implements OnInit {
  items: any[] = [];
  q = '';
  loading = false;

  // form state for create/edit
  creating = false;
  newItem: any = { name: '', price: 0, description: '', dietTags: '', calories: null, allergens: '' };
  editingId: string | null = null;
  editItem: any = {};

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.api.get('/menu').subscribe((res:any)=> { this.items = res || []; this.loading = false; }, err => { this.loading = false; this.toast.error('Failed to load menu'); console.error(err); });
  }

  filtered() {
    const q = this.q.toLowerCase();
    if (!q) return this.items;
    return this.items.filter((m:any)=> (m.name||'').toLowerCase().includes(q) || (m.description||'').toLowerCase().includes(q));
  }

  startCreate() { this.creating = true; this.newItem = { name: '', price: 0, description: '', dietTags: '', calories: null, allergens: '' }; }
  cancelCreate() { this.creating = false; }
  saveCreate() {
    const payload = this.normalizePayload(this.newItem);
    if (!payload.name) { this.toast.error('Name is required'); return; }
    this.api.post('/menu', payload).subscribe((res:any)=> { this.toast.success('Created'); this.creating = false; this.load(); }, err => { this.toast.error(err?.error?.message || 'Create failed'); console.error(err); });
  }

  startEdit(it:any) { this.editingId = it._id; this.editItem = { ...it, dietTags: (it.dietTags||[]).join(', '), allergens: (it.allergens||[]).join(', ') }; }
  cancelEdit() { this.editingId = null; this.editItem = {}; }
  saveEdit() {
    const id = this.editingId; if (!id) return;
    const payload = this.normalizePayload(this.editItem);
    this.api.put(`/menu/${id}`, payload).subscribe((res:any)=> { this.toast.success('Saved'); this.editingId = null; this.load(); }, err => { this.toast.error('Save failed'); console.error(err); });
  }

  remove(it:any) {
    if (!confirm('Delete this item?')) return;
    this.api.delete(`/menu/${it._id}`).subscribe(()=> { this.toast.success('Deleted'); this.load(); }, err => { this.toast.error('Delete failed'); console.error(err); });
  }

  normalizePayload(src:any) {
    return {
      name: (src.name||'').trim(),
      description: (src.description||'').trim() || undefined,
      price: Number(src.price) || 0,
      calories: src.calories !== null && src.calories !== '' ? Number(src.calories) : undefined,
      dietTags: (src.dietTags||'').split(',').map((s:string)=>s.trim()).filter(Boolean),
      allergens: (src.allergens||'').split(',').map((s:string)=>s.trim()).filter(Boolean)
    };
  }
}
