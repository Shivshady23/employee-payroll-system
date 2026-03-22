const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();

const { createSalary, getEmployeeSalary } = require("../controllers/salaryController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

/* ADMIN + SUPERADMIN */
router.post(
  "/create",
  auth,
  role("admin", "superadmin"),
  [
    body("employeeId").isMongoId().withMessage("Invalid employeeId"),
    body("basic")
      .isFloat({ gt: 0 })
      .withMessage("'basic' must be a number greater than 0"),
    body("hra")
      .isFloat({ min: 0 })
      .withMessage("'hra' must be a number greater than or equal to 0"),
    body("conveyance")
      .isFloat({ min: 0 })
      .withMessage("'conveyance' must be a number greater than or equal to 0"),
    body("applyProration")
      .optional()
      .isBoolean()
      .withMessage("'applyProration' must be true or false"),
    body("presentDays")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("'presentDays' must be a number greater than or equal to 0"),
    body("workingDaysInMonth")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("'workingDaysInMonth' must be a number greater than 0")
  ],
  validateRequest,
  createSalary
);

/* USER: own salary ONLY */
router.get(
  "/:employeeId",
  auth,
  [param("employeeId").isMongoId().withMessage("Invalid employeeId")],
  validateRequest,
  getEmployeeSalary
);

module.exports = router;
