import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import EmployeePunchCard from "../../components/EmployeePunchCard";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [salary, setSalary] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("salary");

  const fetchOwnSalary = useCallback(async employeeId => {
    try {
      const response = await api.get(`/salary/${employeeId}`);
      setSalary(response.data?.data?.salary || response.data?.salary || null);
    } catch (_error) {
      setSalary(null);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/employees/me");
      setUserInfo(response.data);
      fetchOwnSalary(response.data._id);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchOwnSalary]);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      fetchUserData();
    }
  }, [fetchUserData]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const totalEarnings = Number(salary?.totalEarnings || 0);
  const totalDeductions = Number(salary?.employeePF || 0) + Number(salary?.employeeESIC || 0);
  const netPay = totalEarnings - totalDeductions;
  const basicSalary = Number(salary?.basic || 0);
  const hra = Number(salary?.hra || 0);
  const conveyance = Number(salary?.conveyance || 0);
  const employeePF = Number(salary?.employeePF || 0);
  const employeeESIC = Number(salary?.employeeESIC || 0);
  const employerPF = Number(salary?.employerPF || 0);
  const employerESIC = Number(salary?.employerESIC || 0);
  const employerPension = Number(salary?.employerPensionContribution ?? salary?.pensionContribution ?? 0);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Employee Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {userInfo && (
        <div className="user-info-card">
          <h3>Your Information</h3>
          <p><strong>Name:</strong> {userInfo.name}</p>
          <p><strong>Email:</strong> {userInfo.email}</p>
          <p><strong>Employee Code:</strong> {userInfo.employeeCode}</p>
          <p><strong>Contact:</strong> {userInfo.contactNumber}</p>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "salary" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("salary")}
        >
          My Salary
        </button>
        <button
          className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("attendance")}
        >
          My Attendance
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "salary" && (
          <div className="salary-view">
            <h2>Your Salary Details</h2>
            {loading ? (
              <p>Loading...</p>
            ) : salary ? (
              <div className="salary-card">
                <div className="salary-preview">
                  <h3 className="preview-title">Salary Breakdown Preview</h3>

                  <div className="preview-section earnings-section">
                    <strong>Earnings</strong>
                    <p className="preview-item">Basic: Rs {basicSalary.toLocaleString()}</p>
                    {salary.applyProration && salary.proratedBasic !== null && (
                      <p className="preview-item">
                        Prorated Basic: Rs {Number(salary.proratedBasic).toLocaleString()}
                      </p>
                    )}
                    <p className="preview-item">HRA: Rs {hra.toLocaleString()}</p>
                    <p className="preview-item">Conveyance: Rs {conveyance.toLocaleString()}</p>
                    <p className="preview-total">Total: Rs {totalEarnings.toLocaleString()}</p>
                  </div>

                  <div className="preview-section deductions-section">
                    <strong>Employee Deductions</strong>
                    <p className="preview-item">PF (12%): Rs {employeePF.toLocaleString()}</p>
                    <p className="preview-item">
                      ESIC (0.75%): Rs {employeeESIC.toLocaleString()}
                      {employeeESIC === 0 && <span className="badge">Not Applicable</span>}
                    </p>
                    <p className="preview-total">Total Deductions: Rs {totalDeductions.toLocaleString()}</p>
                  </div>

                  <div className="preview-section employer-section">
                    <strong>Employer Contributions</strong>
                    <p className="preview-item">PF (3.67%): Rs {employerPF.toLocaleString()}</p>
                    <p className="preview-item">Pension (8.33%): Rs {employerPension.toLocaleString()}</p>
                    <p className="preview-item">
                      ESIC (3.25%): Rs {employerESIC.toLocaleString()}
                      {employerESIC === 0 && <span className="badge">Not Applicable</span>}
                    </p>
                    <p className="preview-total">
                      Total: Rs {(employerPF + employerPension + employerESIC).toLocaleString()}
                    </p>
                  </div>

                  <div className="preview-section netpay-section">
                    <strong>Net Pay</strong>
                    <p className="preview-netpay">Rs {netPay.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-data">No salary information available yet.</p>
            )}
          </div>
        )}
        {activeTab === "attendance" && <EmployeePunchCard />}
      </div>
    </div>
  );
};

export default UserDashboard;
