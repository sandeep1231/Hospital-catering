import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  q = '';
  form = { name: '', email: '', password: '', role: 'user' };
  roles = ['admin','dietician','vendor','kitchen','delivery','user'];
  loading = false;

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params: any = {}; if (this.q) params.q = this.q;
    this.api.get('/users', params).subscribe((res:any)=> { this.users = res || []; this.loading=false; }, err => { this.toast.error('Failed to load users'); this.loading=false; });
  }

  create(e: Event) {
    e.preventDefault();
    if (!this.form.name || !this.form.email || !this.form.password) { this.toast.error('All fields are required'); return; }
    this.api.post('/users', this.form).subscribe((res:any)=> { this.toast.success('User created'); this.form = { name: '', email: '', password: '', role: 'user' }; this.load(); }, err => { this.toast.error(err?.error?.message || 'Create failed'); });
  }

  update(u: any) {
    const body: any = { name: u.name, role: u.role };
    if ((u as any)._newPassword) body.password = (u as any)._newPassword;
    this.api.put(`/users/${u._id}`, body).subscribe(()=> { this.toast.success('Updated'); this.load(); }, err => { this.toast.error('Update failed'); });
  }

  remove(u: any) {
    if (!confirm('Delete user ' + u.email + '?')) return;
    this.api.delete(`/users/${u._id}`).subscribe(()=> { this.toast.success('Deleted'); this.load(); }, err => { this.toast.error('Delete failed'); });
  }
}
