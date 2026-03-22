const toRoundedNumber = value => Number(Math.round(value));

const calculateProratedSalary = (monthlySalary, presentDays, workingDaysInMonth) => {
  if (workingDaysInMonth <= 0) {
    return 0;
  }

  return Number(
    ((Number(monthlySalary) / Number(workingDaysInMonth)) * Number(presentDays)).toFixed(2)
  );
};

const calculatePayrollBreakdown = ({
  basic,
  hra,
  conveyance,
  applyProration = false,
  presentDays,
  workingDaysInMonth
}) => {
  const normalizedBasic = Number(basic);
  const normalizedHra = Number(hra);
  const normalizedConveyance = Number(conveyance);

  const proratedBasic = applyProration
    ? calculateProratedSalary(normalizedBasic, presentDays, workingDaysInMonth)
    : normalizedBasic;

  const totalEarnings = Number(
    (proratedBasic + normalizedHra + normalizedConveyance).toFixed(2)
  );

  // PF, ESIC and pension are calculated against the effective basic amount.
  const employeePF = toRoundedNumber(proratedBasic * 0.12);
  const employerPFTotal = toRoundedNumber(proratedBasic * 0.12);
  const employerPensionContribution = toRoundedNumber(employerPFTotal * 0.8333);
  const employerPFContribution = employerPFTotal - employerPensionContribution;

  const esicApplicable = proratedBasic <= 21000;
  const employeeESIC = esicApplicable ? toRoundedNumber(proratedBasic * 0.0075) : 0;
  const employerESIC = esicApplicable ? toRoundedNumber(proratedBasic * 0.0325) : 0;

  return {
    basic: normalizedBasic,
    hra: normalizedHra,
    conveyance: normalizedConveyance,
    applyProration,
    presentDays: applyProration ? Number(presentDays) : null,
    workingDaysInMonth: applyProration ? Number(workingDaysInMonth) : null,
    proratedBasic: applyProration ? proratedBasic : null,
    totalEarnings,
    employeePF,
    employerPF: employerPFContribution,
    employerPensionContribution,
    pensionContribution: employerPensionContribution,
    employeeESIC,
    employerESIC,
    esicApplicable
  };
};

module.exports = {
  calculateProratedSalary,
  calculatePayrollBreakdown
};
