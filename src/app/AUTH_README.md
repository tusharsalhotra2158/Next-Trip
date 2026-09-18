# Authentication System - Login & Sign Up

This document describes the authentication system implemented in your Angular application.

## Features

### 1. Login Page
- Email and password authentication
- Form validation
- Error messages display
- Loading state during authentication
- Link to sign up page
- Responsive design with gradient background

**Location**: `components/login/`

### 2. Sign Up Page
- User registration with first name, last name, email, and password
- Form validation:
  - All fields required
  - Passwords must match
  - Password minimum 8 characters
- Error messages display
- Loading state during account creation
- Link to login page
- Responsive design

**Location**: `components/signup/`

### 3. Dashboard
- Protected page displayed after successful login
- Shows user information
- Logout functionality
- Responsive navbar

**Location**: `components/dashboard/`

### 4. Authentication Service
- Handles login and signup logic
- Manages user session with localStorage
- Methods available:
  - `login(email, password)` - Authenticate user
  - `signup(userData)` - Create new account
  - `logout()` - Clear session
  - `isLoggedIn()` - Check if user is authenticated
  - `getCurrentUser()` - Get current user info
  - `getAuthToken()` - Get auth token

**Location**: `services/auth.service.ts`

## Demo Credentials

For testing purposes, a demo account is pre-configured:
- **Email**: `user@example.com`
- **Password**: `password123`

## Routes

The application has the following routes:

```
/login         → Login page (default route)
/signup        → Sign up page
/dashboard     → Dashboard (after login)
/              → Redirects to /login
```

## How to Use

### Testing Login Flow
1. Navigate to `http://localhost:4200/login`
2. Enter demo credentials:
   - Email: `user@example.com`
   - Password: `password123`
3. Click "Sign In"
4. You'll be redirected to the dashboard

### Testing Sign Up Flow
1. Navigate to `http://localhost:4200/signup`
2. Fill in the form with your details
3. Password must be at least 8 characters
4. Confirm password must match
5. Click "Sign Up"
6. You'll be redirected to login page
7. Use your new credentials to login

### Testing Logout
1. Click the "Logout" button in the dashboard navbar
2. You'll be redirected to the login page

## Styling

Both login and sign up pages feature:
- Purple gradient background (`#667eea` to `#764ba2`)
- White card containers with shadows
- Smooth transitions and hover effects
- Mobile-responsive design
- Focus states on input fields

## Integration with Real Backend

To integrate with a real backend API, modify the `AuthService`:

```typescript
import { HttpClient } from '@angular/common/http';

constructor(private http: HttpClient) {}

login(email: string, password: string): Observable<LoginResponse> {
  return this.http.post<LoginResponse>('/api/auth/login', {
    email,
    password
  }).pipe(
    tap(response => {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    })
  );
}

signup(userData: UserData): Observable<any> {
  return this.http.post('/api/auth/signup', userData);
}
```

## Security Considerations

⚠️ **Note**: The current implementation stores auth tokens in localStorage for demo purposes only. For production:

1. Consider using httpOnly cookies for token storage
2. Implement proper CSRF protection
3. Add password encryption on the frontend
4. Use HTTPS for all API calls
5. Implement token refresh mechanism
6. Add rate limiting on auth endpoints

## File Structure

```
src/app/
├── components/
│   ├── login/
│   │   ├── login.ts
│   │   ├── login.html
│   │   └── login.css
│   ├── signup/
│   │   ├── signup.ts
│   │   ├── signup.html
│   │   └── signup.css
│   └── dashboard/
│       ├── dashboard.ts
│       ├── dashboard.html
│       └── dashboard.css
├── services/
│   └── auth.service.ts
└── app.routes.ts
```

## Future Enhancements

Consider adding:
- Email verification
- Password reset functionality
- Social login (Google, GitHub, etc.)
- Two-factor authentication
- Remember me functionality
- Auth guards for protected routes
- Interceptor for adding auth token to API requests
- User profile management
- Session timeout handling
