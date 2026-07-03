import { describe, it, expect } from 'vitest';
import { routeDecision, needsRole } from './routing';

describe('routeDecision', () => {
  it('lets unauthenticated visitors browse public pages', () => {
    expect(routeDecision({ authed: false, role: null, path: '/' })).toBeNull();
    expect(routeDecision({ authed: false, role: null, path: '/pricing' })).toBeNull();
    expect(routeDecision({ authed: false, role: null, path: '/login' })).toBeNull();
  });

  it('sends unauthenticated visitors on protected areas to login with next', () => {
    expect(routeDecision({ authed: false, role: null, path: '/dashboard' })).toBe(
      '/login?next=%2Fdashboard',
    );
    expect(routeDecision({ authed: false, role: null, path: '/dashboard/billing' })).toBe(
      '/login?next=%2Fdashboard%2Fbilling',
    );
    expect(routeDecision({ authed: false, role: null, path: '/admin' })).toBe(
      '/login?next=%2Fadmin',
    );
  });

  it('routes the front door by role', () => {
    expect(routeDecision({ authed: true, role: 'admin', path: '/' })).toBe('/admin');
    expect(routeDecision({ authed: true, role: 'customer', path: '/' })).toBe('/dashboard');
    expect(routeDecision({ authed: true, role: 'admin', path: '/login' })).toBe('/admin');
    expect(routeDecision({ authed: true, role: 'customer', path: '/login' })).toBe('/dashboard');
    // Authed but profile not created yet → treat as customer home.
    expect(routeDecision({ authed: true, role: null, path: '/' })).toBe('/dashboard');
  });

  it('keeps customers out of the operator console', () => {
    expect(routeDecision({ authed: true, role: 'customer', path: '/admin' })).toBe('/dashboard');
    expect(routeDecision({ authed: true, role: 'customer', path: '/admin/pipeline' })).toBe(
      '/dashboard',
    );
    expect(routeDecision({ authed: true, role: 'admin', path: '/admin' })).toBeNull();
  });

  it('does not interfere with a customer inside the dashboard', () => {
    expect(routeDecision({ authed: true, role: 'customer', path: '/dashboard' })).toBeNull();
    expect(routeDecision({ authed: true, role: 'customer', path: '/dashboard/reports' })).toBeNull();
  });
});

describe('needsRole', () => {
  it('only resolves the role when the decision depends on it', () => {
    expect(needsRole(true, '/')).toBe(true);
    expect(needsRole(true, '/login')).toBe(true);
    expect(needsRole(true, '/admin')).toBe(true);
    expect(needsRole(true, '/dashboard')).toBe(false); // allowed regardless of role
    expect(needsRole(false, '/')).toBe(false); // unauth: role irrelevant
  });
});
