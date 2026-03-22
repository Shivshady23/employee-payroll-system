const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

process.env.JWT_SECRET = process.env.JWT_SECRET || "attendance-test-secret";

const makeToken = ({ id, role, employeeId = null }) =>
  jwt.sign({ id, role, employeeId }, process.env.JWT_SECRET, { expiresIn: "1h" });

const runAuthAndRole = ({ token, allowedRoles }) => {
  const req = {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined
    }
  };

  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  let reachedNext = false;

  authMiddleware(req, response, () => {
    roleMiddleware(...allowedRoles)(req, response, () => {
      reachedNext = true;
    });
  });

  return { response, reachedNext };
};

test("rejects missing token with 401", () => {
  const { response, reachedNext } = runAuthAndRole({
    token: null,
    allowedRoles: ["user"]
  });

  assert.equal(reachedNext, false);
  assert.equal(response.statusCode, 401);
});

test("rejects invalid token with 401", () => {
  const { response, reachedNext } = runAuthAndRole({
    token: "invalid-token",
    allowedRoles: ["user"]
  });

  assert.equal(reachedNext, false);
  assert.equal(response.statusCode, 401);
});

test("attendance sensitive role guards reject wrong role tokens with 403", () => {
  const routeRoleMap = [
    { route: "POST /api/attendance/punch-in", allowed: ["user"], wrongRole: "admin" },
    { route: "POST /api/attendance/punch-out", allowed: ["user"], wrongRole: "superadmin" },
    {
      route: "GET /api/attendance/employee/:employeeId",
      allowed: ["admin", "superadmin"],
      wrongRole: "user"
    },
    { route: "GET /api/attendance/all", allowed: ["superadmin"], wrongRole: "admin" },
    {
      route: "PUT /api/attendance/:id",
      allowed: ["admin", "superadmin"],
      wrongRole: "user"
    },
    {
      route: "GET /api/attendance/summary/:employeeId",
      allowed: ["admin", "superadmin"],
      wrongRole: "user"
    },
    {
      route: "GET /api/attendance/audit-logs",
      allowed: ["superadmin"],
      wrongRole: "admin"
    }
  ];

  routeRoleMap.forEach((entry, index) => {
    const token = makeToken({
      id: `wrong-role-${index}`,
      role: entry.wrongRole,
      employeeId: "507f1f77bcf86cd799439011"
    });

    const { response, reachedNext } = runAuthAndRole({
      token,
      allowedRoles: entry.allowed
    });

    assert.equal(
      reachedNext,
      false,
      `Expected ${entry.route} to block role ${entry.wrongRole}`
    );
    assert.equal(response.statusCode, 403, `Expected 403 for ${entry.route}`);
    assert.equal(response.payload?.message, "Access denied");
  });
});

test("allows valid role token", () => {
  const token = makeToken({
    id: "admin-1",
    role: "admin",
    employeeId: "507f1f77bcf86cd799439011"
  });

  const { response, reachedNext } = runAuthAndRole({
    token,
    allowedRoles: ["admin", "superadmin"]
  });

  assert.equal(response.statusCode, 200);
  assert.equal(reachedNext, true);
});
