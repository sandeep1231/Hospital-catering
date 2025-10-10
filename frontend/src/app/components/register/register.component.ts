import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  register(e: Event) {
    e.preventDefault();
    this.error = '';
    if (!this.name || !this.email || !this.password) { this.error = 'All fields are required'; return; }
    this.loading = true;
    this.api.post('/auth/register', { name: this.name, email: this.email, password: this.password }).subscribe((res:any) => {
      this.loading = false;
      this.toast.success('Account created — please sign in');
      this.router.navigate(['/login']);
    }, err => {
      this.loading = false;
      this.error = err?.error?.message || 'Registration failed';
      console.error(err);
      this.toast.error(this.error);
    });
  }
}
