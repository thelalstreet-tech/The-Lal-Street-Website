import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BucketPerformanceMetrics } from './bucketPerformanceCalculator';


// --- Interfaces matching component state ---

export interface SIPReportData {
    totalInvested: number;
    currentValue: number;
    profit: number;
    profitPercentage: number;
    cagr: number;
    xirr: number;
    installments: number;
    fundResults: Array<{
        fundName: string;
        weightage: number;
        totalInvested: number;
        currentValue: number;
        profit: number;
        profitPercentage: number;
        cagr: number;
        xirr: number;
    }>;
    inputs: {
        monthlyInvestment: number;
        startDate: string;
        endDate: string;
        funds: Array<{ name: string; weightage: number }>;
    };
    rollingReturns?: BucketPerformanceMetrics;
}

export interface LumpsumReportData {
    bucketPerformance: {
        totalInvestment: number;
        currentValue: number;
        absoluteProfit: number;
        absoluteProfitPercent: number;
        cagr: number;
    };
    fundPerformances: Array<{
        fundName: string;
        investment: number;
        currentValue: number;
        profitLoss: number;
        percentReturns: number;
        cagr: number;
    }>;
    inputs: {
        investmentAmount: number;
        startDate: string;
        endDate: string;
        funds: Array<{ name: string; weightage: number }>;
    };
    rollingReturns?: BucketPerformanceMetrics;
}

export interface SIPLumpsumReportData {
    totalInvested: number;
    sipInvested: number;
    lumpsumInvested: number;
    currentValue: number;
    profit: number;
    profitPercentage: number;
    cagr: number;
    xirr: number;
    fundResults: Array<{
        fundName: string;
        totalInvested: number;
        sipInvested: number;
        lumpsumInvested: number;
        currentValue: number;
        profit: number;
        profitPercentage: number;
        cagr: number;
        xirr: number;
    }>;
    inputs: {
        monthlyInvestment: number;
        lumpsumAmount?: number;
        startDate: string;
        endDate: string;
        lumpsumDate?: string;
        funds: Array<{ name: string; weightage: number }>;
    };
    rollingReturns?: BucketPerformanceMetrics;
}

export interface SWPReportData {
    totalInvested: number;
    totalWithdrawn: number;
    finalCorpus: number;
    finalProfitRemaining: number;
    xirr: number | null;
    survivalMonths: number;
    inputs: {
        totalInvestment: number;
        withdrawalAmount: number;
        frequency: string;
        startDate: string;
        endDate: string;
        funds: Array<{ name: string; weightage: number }>;
    };
    fundSummaries: Array<{
        fundName: string;
        totalInvested: number;
        totalWithdrawn: number;
        currentValue: number;
        profit: number;
    }>;
}


// --- Helper Functions ---

const formatCurrency = (amount: number): string => {
    return 'Rs. ' + new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const addHeader = (doc: jsPDF, title: string) => {
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    // Draw a line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);
};

const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('The Lal Street - Financial Analysis Tool', 14, 285);
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
    }
};

const addRollingReturns = (doc: jsPDF, data: BucketPerformanceMetrics | undefined, startY: number): number => {
    if (!data || data.windowType === 'insufficient') return startY;

    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(`Portfolio Performance (${data.windowType === '3Y' ? '3-Year' : '1-Year'} Rolling Window)`, 14, startY);

    autoTable(doc, {
        startY: startY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Mean Return', `${data.rollingReturns.bucket.mean.toFixed(2)}%`],
            ['Maximum Return', `${data.rollingReturns.bucket.max.toFixed(2)}%`],
            ['Minimum Return', `${data.rollingReturns.bucket.min.toFixed(2)}%`],
            ['Positive Periods', `${data.rollingReturns.bucket.positivePercentage.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [108, 92, 231] }, // Purple shade
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

// --- Report Generators ---

export const generateSIPReport = (data: SIPReportData) => {
    const doc = new jsPDF();
    addHeader(doc, 'SIP Investment Report');

    // Input Summary
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text('Investment Details', 14, 45);

    autoTable(doc, {
        startY: 50,
        head: [['Parameter', 'Value']],
        body: [
            ['Monthly Investment', formatCurrency(data.inputs.monthlyInvestment)],
            ['Start Date', formatDate(data.inputs.startDate)],
            ['End Date', formatDate(data.inputs.endDate)],
            ['Number of Installments', data.installments.toString()],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // Result Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Performance Summary', 14, summaryY);

    autoTable(doc, {
        startY: summaryY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Total Invested', formatCurrency(data.totalInvested)],
            ['Current Value', formatCurrency(data.currentValue)],
            ['Total Profit', formatCurrency(data.profit)],
            ['Absolute Returns', `${data.profitPercentage.toFixed(2)}%`],
            ['CAGR', `${data.cagr.toFixed(2)}%`],
            ['XIRR', `${data.xirr.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
    });

    // Rolling Returns
    const rrY = (doc as any).lastAutoTable.finalY + 15;
    const nextY = addRollingReturns(doc, data.rollingReturns, rrY);


    // Fund-wise Breakdown
    const fundY = (doc as any).lastAutoTable.finalY + 15;
    if (fundY > 250) doc.addPage();

    doc.setFontSize(14);
    doc.text('Fund-wise Breakdown', 14, fundY > 250 ? 20 : fundY);

    autoTable(doc, {
        startY: fundY > 250 ? 25 : fundY + 5,
        head: [['Fund Name', 'Invested', 'Current Value', 'Profit', 'CAGR', 'XIRR']],
        body: data.fundResults.map(fund => [
            fund.fundName,
            formatCurrency(fund.totalInvested),
            formatCurrency(fund.currentValue),
            formatCurrency(fund.profit),
            `${fund.cagr.toFixed(2)}%`,
            `${fund.xirr.toFixed(2)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Fund Name
            1: { cellWidth: 28, halign: 'right' }, // Invested
            2: { cellWidth: 28, halign: 'right' }, // Current Value
            3: { cellWidth: 28, halign: 'right' }, // Profit
            4: { cellWidth: 15, halign: 'right' }, // CAGR
            5: { cellWidth: 15, halign: 'right' }, // XIRR
        },
    });

    addFooter(doc);
    doc.save('SIP_Report.pdf');
};

export const generateLumpsumReport = (data: LumpsumReportData) => {
    const doc = new jsPDF();
    addHeader(doc, 'Lumpsum Investment Report');

    // Input Summary
    doc.setFontSize(14);
    doc.text('Investment Details', 14, 45);

    autoTable(doc, {
        startY: 50,
        head: [['Parameter', 'Value']],
        body: [
            ['Investment Amount', formatCurrency(data.inputs.investmentAmount)],
            ['Start Date', formatDate(data.inputs.startDate)],
            ['End Date', formatDate(data.inputs.endDate)],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // Result Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Performance Summary', 14, summaryY);

    autoTable(doc, {
        startY: summaryY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Total Invested', formatCurrency(data.bucketPerformance.totalInvestment)],
            ['Current Value', formatCurrency(data.bucketPerformance.currentValue)],
            ['Total Profit', formatCurrency(data.bucketPerformance.absoluteProfit)],
            ['Absolute Returns', `${data.bucketPerformance.absoluteProfitPercent.toFixed(2)}%`],
            ['CAGR', `${data.bucketPerformance.cagr.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96] },
    });

    // Rolling Returns
    const rrY = (doc as any).lastAutoTable.finalY + 15;
    const nextY = addRollingReturns(doc, data.rollingReturns, rrY);

    // Fund-wise
    const fundY = nextY + 5;

    doc.setFontSize(14);
    doc.text('Fund-wise Breakdown', 14, fundY);

    autoTable(doc, {
        startY: fundY + 5,
        head: [['Fund Name', 'Invested', 'Current Value', 'Profit', 'Returns']],
        body: data.fundPerformances.map(fund => [
            fund.fundName,
            formatCurrency(fund.investment),
            formatCurrency(fund.currentValue),
            formatCurrency(fund.profitLoss),
            `${fund.percentReturns.toFixed(2)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Fund Name
            1: { cellWidth: 30, halign: 'right' }, // Invested
            2: { cellWidth: 30, halign: 'right' }, // Current Value
            3: { cellWidth: 30, halign: 'right' }, // Profit
            4: { cellWidth: 20, halign: 'right' }, // Returns
        },
    });

    addFooter(doc);
    doc.save('Lumpsum_Report.pdf');
};

export const generateSIPLumpsumReport = (data: SIPLumpsumReportData) => {
    const doc = new jsPDF();
    addHeader(doc, 'SIP + Lumpsum Report');

    doc.setFontSize(14);
    doc.text('Investment Details', 14, 45);

    const inputs = [
        ['Monthly SIP', formatCurrency(data.inputs.monthlyInvestment)],
        ['Start Date', formatDate(data.inputs.startDate)],
        ['End Date', formatDate(data.inputs.endDate)],
    ];

    if (data.inputs.lumpsumAmount) {
        inputs.push(['Lumpsum Amount', formatCurrency(data.inputs.lumpsumAmount)]);
        inputs.push(['Lumpsum Date', formatDate(data.inputs.lumpsumDate || '')]);
    }

    autoTable(doc, {
        startY: 50,
        head: [['Parameter', 'Value']],
        body: inputs,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Performance Summary', 14, summaryY);

    autoTable(doc, {
        startY: summaryY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Total Invested', formatCurrency(data.totalInvested)],
            [' - SIP Portion', formatCurrency(data.sipInvested)],
            [' - Lumpsum Portion', formatCurrency(data.lumpsumInvested)],
            ['Current Value', formatCurrency(data.currentValue)],
            ['Total Profit', formatCurrency(data.profit)],
            ['Absolute Returns', `${data.profitPercentage.toFixed(2)}%`],
            ['CAGR', `${data.cagr.toFixed(2)}%`],
            ['XIRR', `${data.xirr.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] },
    });

    // Rolling Returns
    const rrY = (doc as any).lastAutoTable.finalY + 15;
    const nextY = addRollingReturns(doc, data.rollingReturns, rrY);

    const fundY = nextY + 5;
    if (fundY > 250) doc.addPage();
    doc.setFontSize(14);
    doc.text('Fund-wise Breakdown', 14, fundY > 250 ? 20 : fundY);

    autoTable(doc, {
        startY: fundY > 250 ? 25 : fundY + 5,
        head: [['Fund Name', 'Total Invested', 'Current Value', 'Profit', 'XIRR']],
        body: data.fundResults.map(fund => [
            fund.fundName,
            formatCurrency(fund.totalInvested),
            formatCurrency(fund.currentValue),
            formatCurrency(fund.profit),
            `${fund.xirr.toFixed(2)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Fund Name
            1: { cellWidth: 28, halign: 'right' }, // Total Invested
            2: { cellWidth: 28, halign: 'right' }, // Current Value
            3: { cellWidth: 28, halign: 'right' }, // Profit
            4: { cellWidth: 18, halign: 'right' }, // XIRR
        },
    });

    addFooter(doc);
    doc.save('SIP_Lumpsum_Report.pdf');
};

export const generateSWPReport = (data: SWPReportData) => {
    const doc = new jsPDF();
    addHeader(doc, 'SWP Simulation Report');

    // Input Summary
    doc.setFontSize(14);
    doc.text('Plan Details', 14, 45);

    autoTable(doc, {
        startY: 50,
        head: [['Parameter', 'Value']],
        body: [
            ['Total Investment', formatCurrency(data.inputs.totalInvestment)],
            ['Monthly Withdrawal', formatCurrency(data.inputs.withdrawalAmount)],
            ['Frequency', data.inputs.frequency],
            ['Investment Date', formatDate(data.inputs.startDate)],
            ['End Date', formatDate(data.inputs.endDate)],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // Result Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Simulation Results', 14, summaryY);

    autoTable(doc, {
        startY: summaryY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Total Withdrawn', formatCurrency(data.totalWithdrawn)],
            ['Final Corpus Value', formatCurrency(data.finalCorpus)],
            ['Final Profit Remaining', formatCurrency(data.finalProfitRemaining)],
            ['XIRR', data.xirr ? `${data.xirr.toFixed(2)}%` : 'N/A'],
            ['Survival Duration', `${data.survivalMonths} months`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34] },
    });

    // Fund-wise Breakdown
    const fundY = (doc as any).lastAutoTable.finalY + 15;
    if (fundY > 250) doc.addPage();

    doc.setFontSize(14);
    doc.text('Fund-wise Breakdown', 14, fundY > 250 ? 20 : fundY);

    autoTable(doc, {
        startY: fundY > 250 ? 25 : fundY + 5,
        head: [['Fund Name', 'Total Invested', 'Withdrawn', 'Current Value', 'Profit']],
        body: data.fundSummaries.map(fund => [
            fund.fundName,
            formatCurrency(fund.totalInvested),
            formatCurrency(fund.totalWithdrawn),
            formatCurrency(fund.currentValue),
            formatCurrency(fund.profit)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Fund Name
            1: { cellWidth: 28, halign: 'right' }, // Invested
            2: { cellWidth: 28, halign: 'right' }, // Withdrawn
            3: { cellWidth: 28, halign: 'right' }, // Current Value
            4: { cellWidth: 28, halign: 'right' }, // Profit
        },
    });

    addFooter(doc);
    doc.save('SWP_Report.pdf');
};
