import { useState } from "react";
import api from "../api/axios";

const SalaryView = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [salary, setSalary] = useState(null);

  const fetchSalary = async () => {
    try {
      const res = await api.get(`/salary/${employeeId}`);
      setSalary(res.data?.data?.salary || res.data?.salary || null);
    } catch (err) {
      alert("Salary not found");
      setSalary(null);
    }
  };

  return (
    <div className="salary-card">
      <h2>View Salary</h2>

      <input
        type="text"
        placeholder="Enter Employee ID"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      />

      <button onClick={fetchSalary}>Get Salary</button>

      {salary && (
        <div style={{ marginTop: "20px" }}>
          <h3>👤 Employee Details</h3>
          <p><strong>Name:</strong> {salary.employeeId.name}</p>
          <p><strong>Email:</strong> {salary.employeeId.email}</p>
          <p><strong>Code:</strong> {salary.employeeId.employeeCode}</p>

          <h3>💰 Salary Breakdown</h3>
          
          <div style={{ 
            backgroundColor: "#f0fdf4", 
            padding: "12px", 
            borderRadius: "6px", 
            marginBottom: "12px"
          }}>
            <strong style={{ color: "#16a34a", fontSize: "16px" }}>
              📈 Total Earnings: ₹{salary.totalEarnings}
            </strong>
            <div style={{ fontSize: "13px", marginTop: "8px", marginLeft: "10px" }}>
              ├─ Basic Salary: ₹{salary.basic}<br/>
              ├─ HRA: ₹{salary.hra}<br/>
              └─ Conveyance: ₹{salary.conveyance}
            </div>
          </div>

          <div style={{ 
            backgroundColor: "#fef2f2", 
            padding: "12px", 
            borderRadius: "6px", 
            marginBottom: "12px"
          }}>
            <strong style={{ color: "#dc2626", fontSize: "16px" }}>
              👤 Employee Deductions
            </strong>
            <div style={{ fontSize: "13px", marginTop: "8px", marginLeft: "10px" }}>
              ├─ PF (12% of total): ₹{salary.employeePF}<br/>
              ├─ ESIC (0.75% of total): ₹{salary.employeeESIC}
              {!salary.esicApplicable && " [Not Applicable]"}<br/>
              └─ <strong>Total Deductions: ₹{salary.employeePF + salary.employeeESIC}</strong>
            </div>
          </div>

          <div style={{ 
            backgroundColor: "#eff6ff", 
            padding: "12px", 
            borderRadius: "6px", 
            marginBottom: "12px"
          }}>
            <strong style={{ color: "#2563eb", fontSize: "16px" }}>
              🏢 Employer Contributions
            </strong>
            <div style={{ fontSize: "13px", marginTop: "8px", marginLeft: "10px" }}>
              ├─ PF (3.67% of total): ₹{salary.employerPF}<br/>
              ├─ Pension (8.33% of total): ₹{salary.employerPensionContribution}<br/>
              ├─ ESIC (3.25% of total): ₹{salary.employerESIC}
              {!salary.esicApplicable && " [Not Applicable]"}<br/>
              └─ <strong>Total: ₹{salary.employerPF + salary.employerPensionContribution + salary.employerESIC}</strong>
            </div>
          </div>

          <div style={{ 
            backgroundColor: "#f0fdf4", 
            padding: "12px", 
            borderRadius: "6px", 
            border: "2px solid #22c55e"
          }}>
            <strong style={{ color: "#059669", fontSize: "18px" }}>
              💸 Net Pay: ₹{salary.totalEarnings - (salary.employeePF + salary.employeeESIC)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryView;
