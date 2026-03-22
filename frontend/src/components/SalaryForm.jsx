import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const SalaryForm = () => {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [conveyance, setConveyance] = useState("");
  const [applyProration, setApplyProration] = useState(false);
  const [presentDays, setPresentDays] = useState("");
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState("");
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

    if (applyProration) {
      if (presentDays === "") {
        nextErrors.presentDays = "Present days are required when proration is enabled";
      }

      if (workingDaysInMonth === "") {
        nextErrors.workingDaysInMonth =
          "Working days in month are required when proration is enabled";
      }

      if (
        presentDays !== "" &&
        workingDaysInMonth !== "" &&
        Number(presentDays) > Number(workingDaysInMonth)
      ) {
        nextErrors.presentDays = "Present days cannot exceed working days in month";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const preview = useMemo(() => {
    const basicNum = Number(basic) || 0;
    const hraNum = Number(hra) || 0;
    const conveyanceNum = Number(conveyance) || 0;
    const presentNum = Number(presentDays) || 0;
    const workingNum = Number(workingDaysInMonth) || 0;

    const effectiveBasic =
      applyProration && workingNum > 0
        ? Number(((basicNum / workingNum) * presentNum).toFixed(2))
        : basicNum;

    const totalEarnings = Number((effectiveBasic + hraNum + conveyanceNum).toFixed(2));
    const employeePF = Math.round(effectiveBasic * 0.12);
    const employerPFTotal = Math.round(effectiveBasic * 0.12);
    const employerPension = Math.round(employerPFTotal * 0.8333);
    const employerPF = employerPFTotal - employerPension;
    const esicApplicable = effectiveBasic <= 21000;
    const employeeESIC = esicApplicable ? Math.round(effectiveBasic * 0.0075) : 0;
    const employerESIC = esicApplicable ? Math.round(effectiveBasic * 0.0325) : 0;

    return {
      effectiveBasic,
      totalEarnings,
      employeePF,
      employerPF,
      employerPension,
      employeeESIC,
      employerESIC,
      esicApplicable
    };
  }, [applyProration, basic, conveyance, hra, presentDays, workingDaysInMonth]);

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
        applyProration,
        presentDays: applyProration ? Number(presentDays) : undefined,
        workingDaysInMonth: applyProration ? Number(workingDaysInMonth) : undefined
      });

      const salary = response.data?.data?.salary || response.data?.salary;
      alert(`Salary saved successfully. Total earnings: Rs ${salary?.totalEarnings ?? 0}`);

      setEmployeeId("");
      setBasic("");
      setHra("");
      setConveyance("");
      setApplyProration(false);
      setPresentDays("");
      setWorkingDaysInMonth("");
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

        <div className="form-group attendance-proration-toggle">
          <label htmlFor="apply-proration" className="form-label">
            <input
              id="apply-proration"
              type="checkbox"
              checked={applyProration}
              onChange={event => setApplyProration(event.target.checked)}
            />
            Apply Attendance Proration for this payroll run
          </label>
        </div>

        {applyProration && (
          <div className="salary-inputs-grid">
            <div className="form-group">
              <label htmlFor="present-days" className="form-label">
                Present Days
              </label>
              <input
                id="present-days"
                type="number"
                className={`form-input ${errors.presentDays ? "input-error" : ""}`}
                value={presentDays}
                onChange={event => setPresentDays(event.target.value)}
                min="0"
              />
              {errors.presentDays && <small className="form-error">{errors.presentDays}</small>}
            </div>

            <div className="form-group">
              <label htmlFor="working-days" className="form-label">
                Working Days In Month
              </label>
              <input
                id="working-days"
                type="number"
                className={`form-input ${errors.workingDaysInMonth ? "input-error" : ""}`}
                value={workingDaysInMonth}
                onChange={event => setWorkingDaysInMonth(event.target.value)}
                min="1"
              />
              {errors.workingDaysInMonth && (
                <small className="form-error">{errors.workingDaysInMonth}</small>
              )}
            </div>
          </div>
        )}

        <div className="salary-preview">
          <h3 className="preview-title">Salary Breakdown Preview</h3>
          <div className="preview-section earnings-section">
            <p><strong>Effective Basic:</strong> Rs {preview.effectiveBasic.toLocaleString()}</p>
            <p><strong>Total Earnings:</strong> Rs {preview.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="preview-section deductions-section">
            <p><strong>Employee PF:</strong> Rs {preview.employeePF.toLocaleString()}</p>
            <p><strong>Employee ESIC:</strong> Rs {preview.employeeESIC.toLocaleString()}</p>
          </div>
          <div className="preview-section employer-section">
            <p><strong>Employer PF:</strong> Rs {preview.employerPF.toLocaleString()}</p>
            <p><strong>Employer Pension:</strong> Rs {preview.employerPension.toLocaleString()}</p>
            <p><strong>Employer ESIC:</strong> Rs {preview.employerESIC.toLocaleString()}</p>
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
