import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-invite',
  templateUrl: './admin-invite.component.html',
  styleUrls: ['./admin-invite.component.css']
})
export class AdminInviteComponent {
  name = '';
  email = '';
  password = '';
  role = 'user';
  roles = ['admin','dietician','vendor','kitchen','delivery','user'];
  loading = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  submit(e: Event) {
    e.preventDefault();
    if (!this.name || !this.email || !this.password) { this.toast.error('All fields required'); return; }
    this.loading = true;
    this.api.post('/users', { name: this.name, email: this.email, password: this.password, role: this.role }).subscribe(()=>{
      this.loading = false;
      this.toast.success('User created');
      this.name = this.email = this.password = '';
      this.role = 'user';
    }, err => {
      this.loading = false;
      this.toast.error(err?.error?.message || 'Failed');
    });
  }
}
