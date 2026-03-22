const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    punchIn: {
      type: Date
    },
    punchOut: {
      type: Date
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave"],
      default: "present"
    },
    workHours: {
      type: Number,
      default: 0
    },
    ipAddress: {
      type: String
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    correctionReason: {
      type: String
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

attendanceSchema.pre("save", function updateWorkHours(next) {
  if (
    this.punchIn instanceof Date &&
    this.punchOut instanceof Date &&
    this.punchOut > this.punchIn
  ) {
    this.workHours = Number(
      ((this.punchOut.getTime() - this.punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
  } else {
    this.workHours = 0;
  }

  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
