import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Dynamically choose API base:
  // - Production (dietflow.in, onrender.com): use hosted backend
  // - Otherwise (local dev): call localhost
  base = (() => {
    const prodBase = 'https://api.dietflow.in/api';
    const localBase = 'http://localhost:4000/api';
    try {
      const host = (typeof window !== 'undefined' && window.location && window.location.host) ? window.location.host : '';
      if (host.includes('dietflow.in') || host.includes('github.io') || host.includes('onrender.com') || host.includes('switchinsolutions.com')) return prodBase;
      return localBase;
    } catch {
      return localBase;
    }
  })();
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
  patch(path: string, body: any, params?: any) { const options = this.getHeaders(); if (params) options.params = params; return this.http.patch(this.base + path, body, options); }
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
  getVendorId() { const u: any = this.getUser(); return u?.vendorId || null; }
  getReadOnly() { const u: any = this.getUser(); return !!u?.readOnly; }
  isSuperAdmin() { return this.getUserRole() === 'super-admin'; }
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
