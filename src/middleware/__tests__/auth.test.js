/**
 * @jest-environment node
 */

// Mock DB-dependent modules before auth.js is loaded
jest.mock('../../models', () => ({ User: {} }));
jest.mock('../../services/auth', () => ({}));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn(), sign: jest.fn() }));

const { requireRole } = require('../auth');

describe('requireRole middleware', () => {
  let res, next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('401 when req.user is absent', () => {
    requireRole('owner')({}, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('403 when user role is not in the allowed list', () => {
    const req = { user: { role: 'waiter', email: 'staff@place.com' } };
    requireRole('owner', 'cashier')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when user role matches', () => {
    const req = { user: { role: 'owner' } };
    requireRole('owner', 'cashier')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('platformAdmin bypasses role check (not in allowed list)', () => {
    const req = { user: { role: 'platformAdmin' } };
    requireRole('waiter')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('platformAdmin bypasses even with empty allowed list', () => {
    const req = { user: { role: 'platformAdmin' } };
    requireRole()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('accepts any matching role from a multi-role list', () => {
    const req = { user: { role: 'cashier' } };
    requireRole('waiter', 'cashier', 'owner')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('waiter can access waiter-only routes', () => {
    const req = { user: { role: 'waiter' } };
    requireRole('waiter')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
