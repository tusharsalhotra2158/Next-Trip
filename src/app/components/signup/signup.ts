import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.firstName() || !this.lastName() || !this.email() || !this.password() || !this.confirmPassword()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (this.password().length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const userData = {
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      password: this.password()
    };

    this.authService.signup(userData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Signup failed. Please try again.');
      }
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
