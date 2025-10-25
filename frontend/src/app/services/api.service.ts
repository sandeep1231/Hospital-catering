import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = 'http://localhost:4000/api';
  constructor(private http: HttpClient, private router: Router) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return { headers } as any;
  }

  get(path: string, params?: any) { const options = this.getHeaders(); if (params) options.params = params; return this.http.get(this.base + path, options); }
  post(path: string, body: any, params?: any) { const options = this.getHeaders(); if (params) options.params = params; return this.http.post(this.base + path, body, options); }
  put(path: string, body: any, params?: any) { const options = this.getHeaders(); if (params) options.params = params; return this.http.put(this.base + path, body, options); }
  delete(path: string, params?: any) { const options = this.getHeaders(); if (params) options.params = params; return this.http.delete(this.base + path, options); }

  // blob download with auth header
  getBlob(path: string, params?: any) {
    const options: any = this.getHeaders();
    if (params) options.params = params;
    options.responseType = 'blob';
    options.observe = 'response';
    return this.http.get(this.base + path, options);
  }

  // auth helpers
  setToken(token: string) { localStorage.setItem('token', token); }
  getToken() { return localStorage.getItem('token'); }
  removeToken() { localStorage.removeItem('token'); }

  // parse JWT payload (no verification, used only client-side)
  private parseJwt(token: string | null) {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (e) { return null; }
  }

  getUser() { return this.parseJwt(this.getToken()); }
  getUserRole() { const u: any = this.getUser(); return u?.role || null; }
  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    const payload: any = this.parseJwt(token);
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      this.logout();
      return false;
    }
    return true;
  }
  logout() { this.removeToken(); this.router.navigate(['/login']); }
}
