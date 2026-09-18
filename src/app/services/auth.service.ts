import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
}

// Auth is delegated entirely to the backend (backend/src/data/auth.js):
// passwords are hashed there with bcrypt and sessions are signed JWTs, never
// checked or stored in plaintext client-side.
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private currentUser: AuthUser | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(email: string, password: string): Observable<{ user: AuthUser; token: string }> {
    return this.http.post<ApiEnvelope<{ user: AuthUser; token: string }>>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      map((res) => res.data),
      tap(({ user, token }) => {
        this.currentUser = user;
        if (this.isBrowser) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      }),
      catchError((err) => throwError(() => ({ message: err.error?.message || 'Invalid email or password' }))),
    );
  }

  signup(userData: SignupData): Observable<{ user: AuthUser }> {
    return this.http.post<ApiEnvelope<{ user: AuthUser }>>(`${this.apiUrl}/auth/signup`, userData).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => ({ message: err.error?.message || 'Signup failed. Please try again.' }))),
    );
  }

  logout(): void {
    this.currentUser = null;
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('authToken');
  }

  getCurrentUser(): AuthUser | null {
    if (this.currentUser) return this.currentUser;
    if (!this.isBrowser) return null;
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('authToken');
  }
}
