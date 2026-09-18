import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private users: Map<string, UserData> = new Map();
  private currentUser: any = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeDemoData();
  }

  private initializeDemoData() {
    this.users.set('user@example.com', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      password: 'password123'
    });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const user = this.users.get(email);

    if (!user || user.password !== password) {
      return throwError(() => ({
        message: 'Invalid email or password'
      }));
    }

    const response: LoginResponse = {
      success: true,
      message: 'Login successful',
      token: `token_${Date.now()}`,
      user: {
        id: `user_${email}`,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };

    this.isAuthenticated = true;
    this.currentUser = response.user;
    if (this.isBrowser) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    return of(response).pipe(delay(500));
  }

  signup(userData: UserData): Observable<any> {
    if (this.users.has(userData.email)) {
      return throwError(() => ({
        message: 'Email already exists'
      }));
    }

    this.users.set(userData.email, userData);

    const response = {
      success: true,
      message: 'Account created successfully. Please login.',
      user: {
        id: `user_${userData.email}`,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    };

    return of(response).pipe(delay(500));
  }

  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    const token = localStorage.getItem('authToken');
    return token ? true : false;
  }

  getCurrentUser() {
    if (!this.isBrowser) return null;
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('authToken');
  }
}
