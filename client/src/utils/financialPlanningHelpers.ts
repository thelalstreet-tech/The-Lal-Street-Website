export function getCareerStageLabel(stage: 'early' | 'mid' | 'late'): string {
  switch (stage) {
    case 'early':
      return 'Early Career (22-30)';
    case 'mid':
      return 'Mid Career (31-40)';
    case 'late':
      return 'Late Career (41-55)';
    default:
      return 'Early Career';
  }
}

export function generateReportHTML(
  inputs: any,
  results: any,
  formatCurrency: (amount: number) => string,
  logoUrl?: string
): string {
  const getZoneLabel = (inputs: any): string => {
    // Show city name if available, otherwise fall back to zone/locality
    if (inputs.city) {
      const zoneLabel = inputs.zone === 1 ? 'Zone 1 (Metro)' : inputs.zone === 2 ? 'Zone 2 (Tier-1)' : 'Zone 3';
      return `${inputs.city} - ${zoneLabel}`;
    }
    // Legacy support
    if (inputs.locality) {
      if (inputs.locality === 'metro') return 'Zone 1 (Metro Cities)';
      if (inputs.locality === 'tier1') return 'Zone 2 (Tier-1/Non-Metro)';
      return 'Zone 3 (Rest of India)';
    }
    return 'Not specified';
  };

  const reportTimestamp = new Date().toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Use provided logo URL or default to absolute path
  const logoPath = logoUrl || `${window.location.origin}/logo.png`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Plan Report - ${inputs.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0 0 10px 0;
    }
    .header-timestamp {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #1e40af;
      border-bottom: 2px solid #93c5fd;
      padding-bottom: 10px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .card {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 8px;
      background: #f9fafb;
    }
    .card h4 {
      margin: 0 0 10px 0;
      color: #1e40af;
    }
    .card .value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    table th {
      background-color: #2563eb;
      color: white;
    }
    .recommendations {
      list-style: none;
      padding: 0;
    }
    .recommendations li {
      padding: 10px;
      margin: 10px 0;
      background: #dbeafe;
      border-left: 4px solid #2563eb;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoPath}" alt="The Lal Street" class="header-logo" />
    <h1>Financial Planning Report</h1>
    <p class="header-timestamp">Generated on ${reportTimestamp}</p>
  </div>

  <div class="section">
    <h2>Personal Information</h2>
    <table>
      <tr>
        <th>Name</th>
        <td>${inputs.name}</td>
        <th>Age</th>
        <td>${results.age} years</td>
      </tr>
      <tr>
        <th>Date of Birth</th>
        <td>${new Date(inputs.dob).toLocaleDateString('en-IN')}</td>
        <th>Marital Status</th>
        <td>${inputs.maritalStatus === 'married' ? 'Married' : 'Single'}</td>
      </tr>
      <tr>
        <th>Region</th>
        <td>${getZoneLabel(inputs)}</td>
        <th>Career Stage</th>
        <td>${getCareerStageLabel(results.careerStage)}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Financial Summary</h2>
    <div class="summary-cards">
      <div class="card">
        <h4>Term Insurance Coverage</h4>
        <div class="value">${formatCurrency(results.termInsuranceCover)}</div>
      </div>
      <div class="card">
        <h4>Health Insurance Coverage</h4>
        <div class="value">${results.healthInsuranceCover}</div>
      </div>
      <div class="card">
        <h4>Recommended Monthly SIP</h4>
        <div class="value">${formatCurrency(results.sipRecommendation)}</div>
      </div>
      <div class="card">
        <h4>Emergency Fund</h4>
        <div class="value">${formatCurrency(results.emergencyFund)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Financial Analysis</h2>
    <table>
      <tr>
        <th>Annual Income</th>
        <td>${formatCurrency(inputs.annualIncome)}</td>
      </tr>
      <tr>
        <th>Monthly Expenses</th>
        <td>${formatCurrency(results.monthlyExpenses)}</td>
      </tr>
      <tr>
        <th>Inflation-Adjusted Monthly Expenses (10 years)</th>
        <td>${formatCurrency(results.inflationAdjustedExpenses)}</td>
      </tr>
      <tr>
        <th>Existing Investments</th>
        <td>${formatCurrency(inputs.investments || 0)}</td>
      </tr>
      ${inputs.loanAmount > 0 ? `
      <tr>
        <th>Loan Amount</th>
        <td>${formatCurrency(inputs.loanAmount)}</td>
      </tr>
      ` : ''}
    </table>
  </div>

  <div class="section">
    <h2>Actionable Recommendations</h2>
    <ol class="recommendations">
      ${results.recommendations.map((rec: string, index: number) => `
        <li><strong>${index + 1}.</strong> ${rec}</li>
      `).join('')}
    </ol>
  </div>

  <div class="section">
    <h2>Insurance Details</h2>
    <table>
      <tr>
        <th>Term Insurance Coverage</th>
        <td>${formatCurrency(results.termInsuranceCover)}</td>
        <th>Coverage Period</th>
        <td>${inputs.numberOfKids > 0 ? 'Until youngest child turns 30' : 'Until age 60'}</td>
      </tr>
      <tr>
        <th>Health Insurance Coverage</th>
        <td>${results.healthInsuranceCover}</td>
        <th>Based on</th>
        <td>Annual Income: ${formatCurrency(inputs.annualIncome)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>This report is generated by The Lal Street Financial Planning Tool.</p>
    <p>For personalized financial advice, consult with a certified financial planner.</p>
  </div>
</body>
</html>
  `;
}

export function downloadReport(inputs: any, results: any): void {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const html = generateReportHTML(inputs, results, formatCurrency, `${window.location.origin}/logo.png`);
  
  // Open in new window with print-friendly styling
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If popup blocked, download HTML file instead
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial-Plan-${inputs.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Write HTML to new window
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      // Auto-trigger print dialog (users can select "Save as PDF")
      printWindow.print();
    }, 500);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 1000);
}

