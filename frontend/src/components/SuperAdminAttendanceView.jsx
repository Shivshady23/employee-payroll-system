import { useCallback, useEffect, useMemo, useState } from "react";
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

const SuperAdminAttendanceView = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getAllAttendance({
        page,
        limit: 20,
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined
      });

      setRecords(response?.data?.records || []);
      setPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching all attendance:", error);
      setRecords([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, search, toDate]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await attendanceAPI.getAttendanceAuditLogs({
        page: auditPage,
        limit: 15,
        from: fromDate || undefined,
        to: toDate || undefined
      });
      setAuditLogs(response?.data?.logs || []);
      setAuditPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching attendance audit logs:", error);
      setAuditLogs([]);
      setAuditPages(1);
    }
  }, [auditPage, fromDate, toDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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
      await fetchAttendance();
      await fetchAuditLogs();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update attendance");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  const summary = useMemo(
    () =>
      records.reduce(
        (acc, item) => {
          if (item.status === "present") acc.presentDays += 1;
          if (item.status === "absent") acc.absentDays += 1;
          if (item.status === "half-day") acc.halfDayDays += 1;
          if (item.status === "leave") acc.leaveDays += 1;
          acc.totalWorkHours += Number(item.workHours || 0);
          return acc;
        },
        {
          presentDays: 0,
          absentDays: 0,
          halfDayDays: 0,
          leaveDays: 0,
          totalWorkHours: 0
        }
      ),
    [records]
  );

  return (
    <div className="attendance-admin-view">
      <div className="attendance-filters">
        <input
          type="text"
          className="form-input"
          placeholder="Search by employee name or employee code"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="form-input"
          value={fromDate}
          onChange={event => {
            setFromDate(event.target.value);
            setPage(1);
            setAuditPage(1);
          }}
        />
        <input
          type="date"
          className="form-input"
          value={toDate}
          onChange={event => {
            setToDate(event.target.value);
            setPage(1);
            setAuditPage(1);
          }}
        />
        <button type="button" className="form-button attendance-export-btn" onClick={handleExport}>
          Export to PDF
        </button>
      </div>

      <div className="attendance-summary-card">
        <h3>Filtered Summary</h3>
        <p><strong>Present:</strong> {summary.presentDays}</p>
        <p><strong>Absent:</strong> {summary.absentDays}</p>
        <p><strong>Half-day:</strong> {summary.halfDayDays}</p>
        <p><strong>Leave:</strong> {summary.leaveDays}</p>
        <p><strong>Total Work Hours:</strong> {summary.totalWorkHours.toFixed(2)}</p>
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

      <div className="attendance-audit-panel">
        <h3>Attendance Audit Logs</h3>
        <div className="attendance-audit-list">
          {auditLogs.length === 0 ? (
            <p>No audit entries found.</p>
          ) : (
            auditLogs.map(log => (
              <div className="attendance-audit-item" key={log._id}>
                <p><strong>Action:</strong> {log.action}</p>
                <p><strong>By:</strong> {log.performedBy?.name || "Unknown"} ({log.performedBy?.role || "-"})</p>
                <p><strong>At:</strong> {formatDateTime(log.timestamp)}</p>
                <p><strong>What Changed:</strong></p>
                <pre className="attendance-audit-json">
                  {JSON.stringify(
                    {
                      oldValue: log.oldValue,
                      newValue: log.newValue
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            ))
          )}
        </div>

        <div className="pagination">
          <button
            type="button"
            disabled={auditPage <= 1}
            onClick={() => setAuditPage(prev => prev - 1)}
          >
            Prev
          </button>
          <span>
            Page {auditPage} of {auditPages}
          </span>
          <button
            type="button"
            disabled={auditPage >= auditPages}
            onClick={() => setAuditPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {editRecord && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={event => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeEditModal}>
              x
            </button>

            <h3>Edit Attendance</h3>

            <div className="form-group">
              <label htmlFor="super-edit-date" className="form-label">Date</label>
              <input
                id="super-edit-date"
                type="date"
                className="form-input"
                value={editForm.date}
                onChange={event => setEditForm(prev => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="super-edit-punch-in" className="form-label">Punch In</label>
              <input
                id="super-edit-punch-in"
                type="datetime-local"
                className="form-input"
                value={editForm.punchIn}
                onChange={event => setEditForm(prev => ({ ...prev, punchIn: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="super-edit-punch-out" className="form-label">Punch Out</label>
              <input
                id="super-edit-punch-out"
                type="datetime-local"
                className="form-input"
                value={editForm.punchOut}
                onChange={event => setEditForm(prev => ({ ...prev, punchOut: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="super-edit-status" className="form-label">Status</label>
              <select
                id="super-edit-status"
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
              <label htmlFor="super-edit-reason" className="form-label">Correction Reason</label>
              <textarea
                id="super-edit-reason"
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

export default SuperAdminAttendanceView;
