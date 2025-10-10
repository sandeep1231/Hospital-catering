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

  constructor(private api: ApiService, private router: Router, private toast: ToastService) {}

  login(e: Event) {
    e.preventDefault();
    this.error = '';
    this.api.post('/auth/login', { email: this.email, password: this.password }).subscribe((res: any) => {
      if (res && res.token) {
        this.api.setToken(res.token);
        this.toast.success('Signed in');
        this.router.navigate(['/patients']);
      } else {
        this.error = 'Invalid response';
      }
    }, err => {
      this.error = err?.error?.message || 'Sign in failed';
      console.error(err);
    });
  }
}
