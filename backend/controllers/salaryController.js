const Salary = require("../models/Salary");
const { calculatePayrollBreakdown } = require("../utils/payrollUtils");

/* CREATE SALARY */
exports.createSalary = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const basic = Number(req.body.basic);
    const hra = Number(req.body.hra);
    const conveyance = Number(req.body.conveyance);
    const applyProration =
      req.body.applyProration === true || req.body.applyProration === "true";
    const presentDays =
      req.body.presentDays === undefined ? null : Number(req.body.presentDays);
    const workingDaysInMonth =
      req.body.workingDaysInMonth === undefined
        ? null
        : Number(req.body.workingDaysInMonth);

    if (applyProration) {
      if (presentDays === null || workingDaysInMonth === null) {
        return res.status(400).json({
          success: false,
          message:
            "'presentDays' and 'workingDaysInMonth' are required when proration is enabled",
          data: {}
        });
      }

      if (presentDays > workingDaysInMonth) {
        return res.status(400).json({
          success: false,
          message: "'presentDays' cannot be greater than 'workingDaysInMonth'",
          data: {}
        });
      }
    }

    const payroll = calculatePayrollBreakdown({
      basic,
      hra,
      conveyance,
      applyProration,
      presentDays,
      workingDaysInMonth
    });

    // Check if salary already exists for this employee
    let salary = await Salary.findOne({ employeeId });

    if (salary) {
      // Update existing salary
      salary.basic = payroll.basic;
      salary.hra = payroll.hra;
      salary.conveyance = payroll.conveyance;
      salary.applyProration = payroll.applyProration;
      salary.presentDays = payroll.presentDays;
      salary.workingDaysInMonth = payroll.workingDaysInMonth;
      salary.proratedBasic = payroll.proratedBasic;
      salary.totalEarnings = payroll.totalEarnings;
      salary.employeePF = payroll.employeePF;
      salary.employerPF = payroll.employerPF;
      salary.employerPensionContribution = payroll.employerPensionContribution;
      salary.pensionContribution = payroll.pensionContribution;
      salary.employeeESIC = payroll.employeeESIC;
      salary.employerESIC = payroll.employerESIC;
      salary.esicApplicable = payroll.esicApplicable;
      await salary.save();
    } else {
      // Create new salary
      salary = await Salary.create({
        employeeId,
        ...payroll
      });
    }

    return res.status(201).json({
      success: true,
      message: "Salary created/updated successfully",
      data: {
        salary
      },
      salary
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const loggedInUser = req.user;

    /* USER CAN SEE ONLY OWN SALARY */
    if (
      loggedInUser.role === "user" &&
      loggedInUser.employeeId?.toString() !== employeeId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can view only your own salary",
        data: {}
      });
    }

    const salary = await Salary.findOne({ employeeId }).populate(
      "employeeId",
      "name email employeeCode"
    );

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: "Salary not found",
        data: {}
      });
    }

    return res.status(200).json({
      success: true,
      message: "Salary fetched successfully",
      data: {
        salary
      },
      salary
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};
