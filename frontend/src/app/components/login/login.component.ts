import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  hospitals: any[] = [];
  hospitalId = '';
  loading = false;
  showPassword = false;

  constructor(private api: ApiService, private router: Router, private toast: ToastService) {
    this.api.get('/hospitals').subscribe((res:any)=> {
      this.hospitals = res || [];
      if (this.hospitals.length === 1) this.hospitalId = this.hospitals[0]._id;
    }, console.error);
  }

  login(e: Event) {
    e.preventDefault();
    this.error = '';
    this.loading = true;
    this.api.post('/auth/login', { email: this.email, password: this.password, hospitalId: this.hospitalId || undefined }).subscribe((res: any) => {
      if (res && res.token) {
        this.api.setToken(res.token);
        this.toast.success('Signed in');
        this.router.navigate(['/patients']);
      } else {
        this.error = 'Invalid response';
      }
      this.loading = false;
    }, err => {
      this.error = err?.error?.message || 'Sign in failed';
      console.error(err);
      this.loading = false;
    });
  }
}
