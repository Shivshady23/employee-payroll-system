import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const SalaryForm = () => {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [conveyance, setConveyance] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/employees", { params: { limit: 100 } });
      setEmployees(response.data?.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const validateSalaryAmount = (amount, fieldName) => {
    const num = Number(amount);
    if (num <= 0) return `${fieldName} must be greater than 0`;
    if (num > 1000000) return `${fieldName} cannot exceed Rs 10,00,000`;
    return "";
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!employeeId) {
      nextErrors.employeeId = "Please select an employee";
    }

    if (!basic) {
      nextErrors.basic = "Basic salary is required";
    } else {
      const error = validateSalaryAmount(basic, "Basic salary");
      if (error) nextErrors.basic = error;
    }

    if (hra === "") {
      nextErrors.hra = "HRA is required";
    } else if (Number(hra) < 0) {
      nextErrors.hra = "HRA cannot be negative";
    }

    if (conveyance === "") {
      nextErrors.conveyance = "Conveyance is required";
    } else if (Number(conveyance) < 0) {
      nextErrors.conveyance = "Conveyance cannot be negative";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const preview = useMemo(() => {
    const basicNum = Number(basic) || 0;
    const hraNum = Number(hra) || 0;
    const conveyanceNum = Number(conveyance) || 0;
    const totalEarnings = Number((basicNum + hraNum + conveyanceNum).toFixed(2));
    const employeePF = Math.round(basicNum * 0.12);
    const employerPFTotal = Math.round(basicNum * 0.12);
    const employerPension = Math.round(employerPFTotal * 0.8333);
    const employerPF = employerPFTotal - employerPension;
    const esicApplicable = basicNum <= 21000;
    const employeeESIC = esicApplicable ? Math.round(basicNum * 0.0075) : 0;
    const employerESIC = esicApplicable ? Math.round(basicNum * 0.0325) : 0;
    const totalDeductions = employeePF + employeeESIC;
    const employerTotal = employerPF + employerPension + employerESIC;
    const netPay = totalEarnings - totalDeductions;

    return {
      basicNum,
      hraNum,
      conveyanceNum,
      totalEarnings,
      employeePF,
      employerPF,
      employerPension,
      employeeESIC,
      employerESIC,
      esicApplicable,
      totalDeductions,
      employerTotal,
      netPay
    };
  }, [basic, conveyance, hra]);

  const handleSubmit = async event => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/salary/create", {
        employeeId,
        basic: Number(basic),
        hra: Number(hra),
        conveyance: Number(conveyance),
        applyProration: false
      });

      const salary = response.data?.data?.salary || response.data?.salary;
      alert(`Salary saved successfully. Total earnings: Rs ${salary?.totalEarnings ?? 0}`);

      setEmployeeId("");
      setBasic("");
      setHra("");
      setConveyance("");
      setErrors({});
    } catch (error) {
      alert(error.response?.data?.message || "Error creating salary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container professional-form">
      <h2 className="form-title">Create/Update Salary</h2>

      <form onSubmit={handleSubmit} className="salary-form">
        <div className="form-group">
          <label htmlFor="employeeId" className="form-label">
            Select Employee
          </label>
          <select
            id="employeeId"
            value={employeeId}
            onChange={event => setEmployeeId(event.target.value)}
            className={`form-input form-select ${errors.employeeId ? "input-error" : ""}`}
            required
          >
            <option value="">-- Choose Employee --</option>
            {employees.map(employee => (
              <option key={employee._id} value={employee._id}>
                {employee.employeeCode} - {employee.name}
              </option>
            ))}
          </select>
          {errors.employeeId && <small className="form-error">{errors.employeeId}</small>}
        </div>

        <div className="salary-inputs-grid">
          <div className="form-group">
            <label htmlFor="basic" className="form-label">
              Basic Salary
            </label>
            <div className="input-with-currency">
              <span className="currency-symbol">Rs</span>
              <input
                id="basic"
                type="number"
                className={`form-input ${errors.basic ? "input-error" : ""}`}
                value={basic}
                onChange={event => setBasic(event.target.value)}
                min="0"
                required
              />
            </div>
            {errors.basic && <small className="form-error">{errors.basic}</small>}
          </div>

          <div className="form-group">
            <label htmlFor="hra" className="form-label">
              HRA
            </label>
            <div className="input-with-currency">
              <span className="currency-symbol">Rs</span>
              <input
                id="hra"
                type="number"
                className={`form-input ${errors.hra ? "input-error" : ""}`}
                value={hra}
                onChange={event => setHra(event.target.value)}
                min="0"
                required
              />
            </div>
            {errors.hra && <small className="form-error">{errors.hra}</small>}
          </div>

          <div className="form-group">
            <label htmlFor="conveyance" className="form-label">
              Conveyance
            </label>
            <div className="input-with-currency">
              <span className="currency-symbol">Rs</span>
              <input
                id="conveyance"
                type="number"
                className={`form-input ${errors.conveyance ? "input-error" : ""}`}
                value={conveyance}
                onChange={event => setConveyance(event.target.value)}
                min="0"
                required
              />
            </div>
            {errors.conveyance && <small className="form-error">{errors.conveyance}</small>}
          </div>
        </div>

        <div className="salary-preview">
          <h3 className="preview-title">Salary Breakdown Preview</h3>
          <div className="preview-section earnings-section">
            <strong>Earnings</strong>
            <p className="preview-item">Basic: Rs {preview.basicNum.toLocaleString()}</p>
            <p className="preview-item">HRA: Rs {preview.hraNum.toLocaleString()}</p>
            <p className="preview-item">Conveyance: Rs {preview.conveyanceNum.toLocaleString()}</p>
            <p className="preview-total">Total: Rs {preview.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="preview-section deductions-section">
            <strong>Employee Deductions</strong>
            <p className="preview-item">PF (12%): Rs {preview.employeePF.toLocaleString()}</p>
            <p className="preview-item">
              ESIC (0.75%): Rs {preview.employeeESIC.toLocaleString()}
              {!preview.esicApplicable && <span className="badge">Not Applicable</span>}
            </p>
            <p className="preview-total">
              Total Deductions: Rs {preview.totalDeductions.toLocaleString()}
            </p>
          </div>
          <div className="preview-section employer-section">
            <strong>Employer Contributions</strong>
            <p className="preview-item">PF (3.67%): Rs {preview.employerPF.toLocaleString()}</p>
            <p className="preview-item">
              Pension (8.33%): Rs {preview.employerPension.toLocaleString()}
            </p>
            <p className="preview-item">
              ESIC (3.25%): Rs {preview.employerESIC.toLocaleString()}
              {!preview.esicApplicable && <span className="badge">Not Applicable</span>}
            </p>
            <p className="preview-total">Total: Rs {preview.employerTotal.toLocaleString()}</p>
          </div>
          <div className="preview-section netpay-section">
            <strong>Net Pay</strong>
            <p className="preview-netpay">Rs {preview.netPay.toLocaleString()}</p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="form-button">
          {loading ? "Saving..." : "Save Salary"}
        </button>
      </form>
    </div>
  );
};

export default SalaryForm;
