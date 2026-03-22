const Attendance = require("../models/Attendance");
const AuditLog = require("../models/AuditLog");
const Employee = require("../models/Employee");

const ATTENDANCE_COLLECTION = "Attendance";

const getUtcDayRange = dateInput => {
  const baseDate = dateInput ? new Date(dateInput) : new Date(Date.now());
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const start = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

const createAuditLog = async ({
  performedBy,
  action,
  targetId,
  oldValue = null,
  newValue = null
}) => {
  await AuditLog.create({
    performedBy,
    action,
    targetCollection: ATTENDANCE_COLLECTION,
    targetId,
    oldValue,
    newValue
  });
};

const getDateFilter = (from, to) => {
  if (!from && !to) {
    return null;
  }

  const filter = {};
  if (from) {
    const fromDate = getUtcDayRange(from);
    if (fromDate) {
      filter.$gte = fromDate.start;
    }
  }

  if (to) {
    const toDate = getUtcDayRange(to);
    if (toDate) {
      filter.$lt = toDate.end;
    }
  }

  return Object.keys(filter).length > 0 ? filter : null;
};

exports.punchIn = async (req, res) => {
  try {
    if (!req.user?.employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee mapping not found for this user",
        data: {}
      });
    }

    const now = new Date(Date.now());
    const dayRange = getUtcDayRange(now);
    const employeeId = req.user.employeeId;

    const alreadyExists = await Attendance.findOne({
      employeeId,
      date: { $gte: dayRange.start, $lt: dayRange.end }
    });

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Punch in already marked for today",
        data: {}
      });
    }

    const attendance = await Attendance.create({
      employeeId,
      date: dayRange.start,
      punchIn: now,
      status: "present",
      ipAddress: req.ip
    });

    await createAuditLog({
      performedBy: req.user.id,
      action: "PUNCH_IN",
      targetId: attendance._id,
      oldValue: null,
      newValue: attendance.toObject()
    });

    return res.status(201).json({
      success: true,
      message: "Punch in recorded successfully",
      data: { attendance }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Punch in already marked for today",
        data: {}
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.punchOut = async (req, res) => {
  try {
    if (!req.user?.employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee mapping not found for this user",
        data: {}
      });
    }

    const now = new Date(Date.now());
    const dayRange = getUtcDayRange(now);
    const employeeId = req.user.employeeId;

    const attendance = await Attendance.findOne({
      employeeId,
      date: { $gte: dayRange.start, $lt: dayRange.end }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Punch in not found for today",
        data: {}
      });
    }

    if (!attendance.punchIn) {
      return res.status(400).json({
        success: false,
        message: "Cannot punch out before punch in",
        data: {}
      });
    }

    if (attendance.punchOut) {
      return res.status(400).json({
        success: false,
        message: "Punch out already marked for today",
        data: {}
      });
    }

    if (now <= attendance.punchIn) {
      return res.status(400).json({
        success: false,
        message: "Punch out time must be after punch in time",
        data: {}
      });
    }

    const oldValue = attendance.toObject();
    attendance.punchOut = now;
    attendance.workHours = Number(
      ((attendance.punchOut.getTime() - attendance.punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    attendance.status = attendance.workHours < 4 ? "half-day" : "present";
    await attendance.save();

    await createAuditLog({
      performedBy: req.user.id,
      action: "PUNCH_OUT",
      targetId: attendance._id,
      oldValue,
      newValue: attendance.toObject()
    });

    return res.status(200).json({
      success: true,
      message: "Punch out recorded successfully",
      data: { attendance }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    if (!req.user?.employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee mapping not found for this user",
        data: {}
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = { employeeId: req.user.employeeId };
    const dateFilter = getDateFilter(req.query.from, req.query.to);
    if (dateFilter) {
      filter.date = dateFilter;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched successfully",
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = { employeeId };
    const dateFilter = getDateFilter(req.query.from, req.query.to);
    if (dateFilter) {
      filter.date = dateFilter;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate("employeeId", "name employeeCode email")
        .populate("markedBy", "name email role")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "Employee attendance fetched successfully",
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const filter = {};
    const dateFilter = getDateFilter(req.query.from, req.query.to);
    if (dateFilter) {
      filter.date = dateFilter;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      const matchedEmployees = await Employee.find({
        $or: [{ name: regex }, { employeeCode: regex }]
      }).select("_id");

      if (matchedEmployees.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Attendance records fetched successfully",
          data: {
            records: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }

      filter.employeeId = { $in: matchedEmployees.map(employee => employee._id) };
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate("employeeId", "name employeeCode email")
        .populate("markedBy", "name email role")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched successfully",
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, punchIn, punchOut, status, correctionReason } = req.body;
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
        data: {}
      });
    }

    const oldValue = attendance.toObject();

    if (date) {
      const range = getUtcDayRange(date);
      attendance.date = range.start;
    }

    if (punchIn) {
      attendance.punchIn = new Date(punchIn);
    }

    if (punchOut) {
      attendance.punchOut = new Date(punchOut);
    }

    if (
      attendance.punchIn &&
      attendance.punchOut &&
      attendance.punchOut <= attendance.punchIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Punch out time must be after punch in time",
        data: {}
      });
    }

    if (status) {
      attendance.status = status;
    } else if (attendance.punchIn && attendance.punchOut) {
      attendance.status = attendance.workHours < 4 ? "half-day" : "present";
    }

    attendance.markedBy = req.user.id;
    attendance.correctionReason = correctionReason;

    await attendance.save();

    await AuditLog.create({
      performedBy: req.user.id,
      action: "ATTENDANCE_EDIT",
      targetCollection: ATTENDANCE_COLLECTION,
      targetId: attendance._id,
      oldValue,
      newValue: attendance.toObject()
    });

    const updated = await Attendance.findById(req.params.id)
      .populate("employeeId", "name employeeCode email")
      .populate("markedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: { attendance: updated }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate attendance entry for the same employee and date",
        data: {}
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const currentDate = new Date(Date.now());
    const month = Number(req.query.month) || currentDate.getUTCMonth() + 1;
    const year = Number(req.query.year) || currentDate.getUTCFullYear();

    const { start, end } = getMonthRange(month, year);

    const records = await Attendance.find({
      employeeId,
      date: { $gte: start, $lt: end }
    }).sort({ date: 1 });

    const summary = records.reduce(
      (acc, record) => {
        const hours = Number(record.workHours || 0);
        acc.totalWorkHours += hours;

        if (record.status === "present") {
          acc.presentDays += 1;
        } else if (record.status === "absent") {
          acc.absentDays += 1;
        } else if (record.status === "half-day") {
          acc.halfDayDays += 1;
        } else if (record.status === "leave") {
          acc.leaveDays += 1;
        }

        return acc;
      },
      {
        presentDays: 0,
        absentDays: 0,
        halfDayDays: 0,
        leaveDays: 0,
        totalWorkHours: 0
      }
    );

    summary.totalWorkHours = Number(summary.totalWorkHours.toFixed(2));
    summary.payableDays = Number((summary.presentDays + summary.halfDayDays * 0.5).toFixed(2));

    return res.status(200).json({
      success: true,
      message: "Monthly attendance summary fetched successfully",
      data: {
        employeeId,
        month,
        year,
        summary
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

exports.getAttendanceAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { targetCollection: ATTENDANCE_COLLECTION };
    const timestampFilter = getDateFilter(req.query.from, req.query.to);
    if (timestampFilter) {
      filter.timestamp = timestampFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("performedBy", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "Attendance audit logs fetched successfully",
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};
