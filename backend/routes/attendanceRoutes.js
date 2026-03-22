const express = require("express");
const { body, param, query } = require("express-validator");

const {
  punchIn,
  punchOut,
  getMyAttendance,
  getEmployeeAttendance,
  getAllAttendance,
  updateAttendance,
  getMonthlySummary,
  getAttendanceAuditLogs
} = require("../controllers/attendanceController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const dateRangeValidators = [
  query("from").optional().isISO8601().withMessage("'from' must be a valid date"),
  query("to").optional().isISO8601().withMessage("'to' must be a valid date"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("'page' must be an integer greater than or equal to 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("'limit' must be an integer between 1 and 200")
];

router.post("/punch-in", auth, role("user"), punchIn);
router.post("/punch-out", auth, role("user"), punchOut);
router.get("/my", auth, role("user"), dateRangeValidators, validateRequest, getMyAttendance);

router.get(
  "/employee/:employeeId",
  auth,
  role("admin", "superadmin"),
  [
    param("employeeId").isMongoId().withMessage("Invalid employeeId"),
    ...dateRangeValidators
  ],
  validateRequest,
  getEmployeeAttendance
);

router.get(
  "/all",
  auth,
  role("superadmin"),
  [
    ...dateRangeValidators,
    query("search").optional().isString().withMessage("'search' must be a string")
  ],
  validateRequest,
  getAllAttendance
);

router.put(
  "/:id",
  auth,
  role("admin", "superadmin"),
  [
    param("id").isMongoId().withMessage("Invalid attendance id"),
    body("date").optional().isISO8601().withMessage("'date' must be a valid date"),
    body("punchIn").optional().isISO8601().withMessage("'punchIn' must be a valid datetime"),
    body("punchOut").optional().isISO8601().withMessage("'punchOut' must be a valid datetime"),
    body("status")
      .optional()
      .isIn(["present", "absent", "half-day", "leave"])
      .withMessage("'status' must be one of present, absent, half-day, leave"),
    body("correctionReason")
      .trim()
      .notEmpty()
      .withMessage("'correctionReason' is required for attendance edits")
  ],
  validateRequest,
  updateAttendance
);

router.get(
  "/summary/:employeeId",
  auth,
  role("admin", "superadmin"),
  [
    param("employeeId").isMongoId().withMessage("Invalid employeeId"),
    query("month")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("'month' must be between 1 and 12"),
    query("year")
      .optional()
      .isInt({ min: 1970, max: 9999 })
      .withMessage("'year' must be a valid year")
  ],
  validateRequest,
  getMonthlySummary
);

router.get(
  "/audit-logs",
  auth,
  role("superadmin"),
  dateRangeValidators,
  validateRequest,
  getAttendanceAuditLogs
);

module.exports = router;
