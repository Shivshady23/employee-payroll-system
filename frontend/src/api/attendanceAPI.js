import api from "./axios";

const getData = response => response.data;

const attendanceAPI = {
  punchIn: () => api.post("/attendance/punch-in").then(getData),
  punchOut: () => api.post("/attendance/punch-out").then(getData),
  getMyAttendance: params => api.get("/attendance/my", { params }).then(getData),
  getEmployeeAttendance: (employeeId, params) =>
    api.get(`/attendance/employee/${employeeId}`, { params }).then(getData),
  getAllAttendance: params => api.get("/attendance/all", { params }).then(getData),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data).then(getData),
  getMonthlySummary: (employeeId, month, year) =>
    api
      .get(`/attendance/summary/${employeeId}`, {
        params: { month, year }
      })
      .then(getData),
  getAttendanceAuditLogs: params =>
    api.get("/attendance/audit-logs", { params }).then(getData)
};

export default attendanceAPI;
