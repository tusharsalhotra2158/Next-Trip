import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/travel/search',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./components/signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'travel',
    children: [
      {
        path: 'search',
        loadComponent: () =>
          import('./features/travel/pages/search/destination-search').then(
            (m) => m.DestinationSearchComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/travel/search',
  },
];
