const { checkModuleAccess } = require('../../src/middleware/moduleAccess');
const { getAdminModules } = require('../../src/controllers/module.controller');

jest.mock('../../src/controllers/module.controller');

describe('Module Access Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      app: {
        locals: {
          pool: { execute: jest.fn() }
        }
      },
      user: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  test('should allow access if admin has module', async () => {
    req.user = { adminId: 1 };
    getAdminModules.mockResolvedValueOnce({
      modules: ['assets', 'licenses']
    });

    const middleware = checkModuleAccess('assets');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should deny access if admin does not have module', async () => {
    req.user = { adminId: 1 };
    getAdminModules.mockResolvedValueOnce({
      modules: ['assets']
    });

    const middleware = checkModuleAccess('licenses');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Access denied') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 500 if database connection not available', async () => {
    req.app.locals.pool = null;
    req.user = { adminId: 1 };

    const middleware = checkModuleAccess('assets');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 if user info not found', async () => {
    req.user = null;

    const middleware = checkModuleAccess('assets');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

