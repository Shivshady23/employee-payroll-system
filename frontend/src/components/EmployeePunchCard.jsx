import { useCallback, useEffect, useMemo, useState } from "react";
import attendanceAPI from "../api/attendanceAPI";

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

const EmployeePunchCard = () => {
  const [now, setNow] = useState(new Date(Date.now()));
  const [todayRecord, setTodayRecord] = useState(null);
  const [lastSevenDays, setLastSevenDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMyAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date(Date.now());
      const from = new Date(today);
      from.setDate(from.getDate() - 6);

      const response = await attendanceAPI.getMyAttendance({
        from: from.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
        page: 1,
        limit: 30
      });

      const records = response?.data?.records || [];
      const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
      const todayKey = today.toISOString().slice(0, 10);
      const currentDayRecord =
        sorted.find(item => new Date(item.date).toISOString().slice(0, 10) === todayKey) || null;

      setTodayRecord(currentDayRecord);
      setLastSevenDays(sorted.slice(0, 7));
    } catch (_error) {
      setTodayRecord(null);
      setLastSevenDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAttendance();
  }, [fetchMyAttendance]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date(Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePunchIn = async () => {
    try {
      setActionLoading(true);
      await attendanceAPI.punchIn();
      await fetchMyAttendance();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to punch in");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setActionLoading(true);
      await attendanceAPI.punchOut();
      await fetchMyAttendance();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to punch out");
    } finally {
      setActionLoading(false);
    }
  };

  const canPunchIn = useMemo(() => !todayRecord?.punchIn, [todayRecord]);
  const canPunchOut = useMemo(
    () => Boolean(todayRecord?.punchIn && !todayRecord?.punchOut),
    [todayRecord]
  );

  return (
    <div className="attendance-card">
      <div className="attendance-live-clock">
        <h2>My Attendance</h2>
        <p>{now.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        <p>{now.toLocaleTimeString()}</p>
      </div>

      <div className="attendance-actions">
        <button
          type="button"
          className="form-button"
          onClick={handlePunchIn}
          disabled={loading || actionLoading || !canPunchIn}
        >
          Punch In
        </button>
        <button
          type="button"
          className="form-button"
          onClick={handlePunchOut}
          disabled={loading || actionLoading || !canPunchOut}
        >
          Punch Out
        </button>
      </div>

      <div className="today-status-card">
        <h3>Today's Status</h3>
        {loading ? (
          <p>Loading attendance...</p>
        ) : (
          <>
            <p>
              <strong>Punch In:</strong> {formatDateTime(todayRecord?.punchIn)}
            </p>
            <p>
              <strong>Punch Out:</strong> {formatDateTime(todayRecord?.punchOut)}
            </p>
            <p>
              <strong>Work Hours:</strong> {todayRecord?.workHours ?? 0}
            </p>
            <p>
              <strong>Status:</strong> {todayRecord?.status || "absent"}
            </p>
          </>
        )}
      </div>

      <div className="attendance-table-wrap">
        <h3>Last 7 Days</h3>
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Work Hours</th>
            </tr>
          </thead>
          <tbody>
            {lastSevenDays.length === 0 ? (
              <tr>
                <td colSpan="5">No records found.</td>
              </tr>
            ) : (
              lastSevenDays.map(item => (
                <tr key={item._id}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.status}</td>
                  <td>{formatDateTime(item.punchIn)}</td>
                  <td>{formatDateTime(item.punchOut)}</td>
                  <td>{item.workHours || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeePunchCard;
