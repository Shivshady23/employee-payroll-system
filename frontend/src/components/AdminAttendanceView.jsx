import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import attendanceAPI from "../api/attendanceAPI";

const ATTENDANCE_STATUSES = ["present", "absent", "half-day", "leave"];

const toDatetimeLocal = value => {
  if (!value) return "";
  const date = new Date(value);
  const pad = input => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const formatDate = value =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "-";

const formatDateTime = value =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

const getDefaultSummary = () => ({
  presentDays: 0,
  absentDays: 0,
  halfDayDays: 0,
  leaveDays: 0,
  totalWorkHours: 0,
  payableDays: 0
});

const AdminAttendanceView = () => {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(getDefaultSummary());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    punchIn: "",
    punchOut: "",
    status: "present",
    correctionReason: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find(item => item._id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/employees", {
        params: {
          search,
          page: 1,
          limit: 25
        }
      });
      const employeeList = response.data?.employees || [];
      setEmployees(employeeList);

      if (!selectedEmployeeId && employeeList.length > 0) {
        setSelectedEmployeeId(employeeList[0]._id);
      }
    } catch (error) {
      console.error("Error fetching employees for attendance:", error);
    }
  }, [search, selectedEmployeeId]);

  const fetchEmployeeAttendance = useCallback(async () => {
    if (!selectedEmployeeId) return;

    try {
      setLoading(true);
      const response = await attendanceAPI.getEmployeeAttendance(selectedEmployeeId, {
        page,
        limit: 20,
        from: fromDate || undefined,
        to: toDate || undefined
      });

      setRecords(response?.data?.records || []);
      setPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error("Error loading employee attendance:", error);
      setRecords([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, selectedEmployeeId, toDate]);

  const fetchMonthlySummary = useCallback(async () => {
    if (!selectedEmployeeId) return;

    const baseDate = fromDate ? new Date(fromDate) : new Date(Date.now());
    const month = baseDate.getMonth() + 1;
    const year = baseDate.getFullYear();

    try {
      const response = await attendanceAPI.getMonthlySummary(selectedEmployeeId, month, year);
      setSummary(response?.data?.summary || getDefaultSummary());
    } catch (_error) {
      setSummary(getDefaultSummary());
    }
  }, [fromDate, selectedEmployeeId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchEmployeeAttendance();
    fetchMonthlySummary();
  }, [fetchEmployeeAttendance, fetchMonthlySummary]);

  const openEditModal = record => {
    setEditRecord(record);
    setEditForm({
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : "",
      punchIn: toDatetimeLocal(record.punchIn),
      punchOut: toDatetimeLocal(record.punchOut),
      status: record.status || "present",
      correctionReason: ""
    });
  };

  const closeEditModal = () => {
    setEditRecord(null);
    setEditForm({
      date: "",
      punchIn: "",
      punchOut: "",
      status: "present",
      correctionReason: ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    if (!editForm.correctionReason.trim()) {
      alert("Correction reason is required");
      return;
    }

    try {
      setSavingEdit(true);
      const payload = {
        status: editForm.status,
        correctionReason: editForm.correctionReason.trim()
      };

      if (editForm.date) {
        payload.date = new Date(editForm.date).toISOString();
      }

      if (editForm.punchIn) {
        payload.punchIn = new Date(editForm.punchIn).toISOString();
      }

      if (editForm.punchOut) {
        payload.punchOut = new Date(editForm.punchOut).toISOString();
      }

      await attendanceAPI.updateAttendance(editRecord._id, payload);
      closeEditModal();
      await fetchEmployeeAttendance();
      await fetchMonthlySummary();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update attendance");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="attendance-admin-view">
      <div className="attendance-filters">
        <input
          type="text"
          className="form-input"
          placeholder="Search employee by name or employee code"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <select
          className="form-select"
          value={selectedEmployeeId}
          onChange={event => {
            setSelectedEmployeeId(event.target.value);
            setPage(1);
          }}
        >
          {employees.length === 0 && <option value="">No employees found</option>}
          {employees.map(employee => (
            <option key={employee._id} value={employee._id}>
              {employee.employeeCode} - {employee.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="form-input"
          value={fromDate}
          onChange={event => {
            setFromDate(event.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="form-input"
          value={toDate}
          onChange={event => {
            setToDate(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="attendance-summary-card">
        <h3>Monthly Summary {selectedEmployee ? `for ${selectedEmployee.name}` : ""}</h3>
        <p><strong>Present:</strong> {summary.presentDays}</p>
        <p><strong>Absent:</strong> {summary.absentDays}</p>
        <p><strong>Half-day:</strong> {summary.halfDayDays}</p>
        <p><strong>Leave:</strong> {summary.leaveDays}</p>
        <p><strong>Total Work Hours:</strong> {summary.totalWorkHours}</p>
      </div>

      <div className="attendance-table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Date</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Work Hours</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading attendance records...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="8">No attendance records found.</td>
              </tr>
            ) : (
              records.map(record => (
                <tr key={record._id}>
                  <td>{record.employeeId?.employeeCode || "-"}</td>
                  <td>{record.employeeId?.name || "-"}</td>
                  <td>{formatDate(record.date)}</td>
                  <td>{formatDateTime(record.punchIn)}</td>
                  <td>{formatDateTime(record.punchOut)}</td>
                  <td>{record.workHours || 0}</td>
                  <td>{record.status}</td>
                  <td>
                    <button
                      type="button"
                      className="action-btn view-btn"
                      onClick={() => openEditModal(record)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          Prev
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => setPage(prev => prev + 1)}
        >
          Next
        </button>
      </div>

      {editRecord && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={event => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeEditModal}>
              x
            </button>

            <h3>Edit Attendance</h3>

            <div className="form-group">
              <label htmlFor="edit-date" className="form-label">Date</label>
              <input
                id="edit-date"
                type="date"
                className="form-input"
                value={editForm.date}
                onChange={event => setEditForm(prev => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-punch-in" className="form-label">Punch In</label>
              <input
                id="edit-punch-in"
                type="datetime-local"
                className="form-input"
                value={editForm.punchIn}
                onChange={event => setEditForm(prev => ({ ...prev, punchIn: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-punch-out" className="form-label">Punch Out</label>
              <input
                id="edit-punch-out"
                type="datetime-local"
                className="form-input"
                value={editForm.punchOut}
                onChange={event => setEditForm(prev => ({ ...prev, punchOut: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-status" className="form-label">Status</label>
              <select
                id="edit-status"
                className="form-select"
                value={editForm.status}
                onChange={event => setEditForm(prev => ({ ...prev, status: event.target.value }))}
              >
                {ATTENDANCE_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-reason" className="form-label">Correction Reason</label>
              <textarea
                id="edit-reason"
                className="form-input attendance-textarea"
                value={editForm.correctionReason}
                onChange={event =>
                  setEditForm(prev => ({
                    ...prev,
                    correctionReason: event.target.value
                  }))
                }
                placeholder="Required: explain why this attendance was corrected."
              />
            </div>

            <button
              type="button"
              className="form-button"
              disabled={savingEdit}
              onClick={handleSaveEdit}
            >
              {savingEdit ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceView;
