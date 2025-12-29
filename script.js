document.getElementById('submissionForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.querySelector('.submit-btn');
    const statusMessage = document.getElementById('statusMessage');

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating PDF...';
    statusMessage.className = 'status-message info';
    statusMessage.textContent = 'Generating PDF, please wait...';

    try {
        // Generate PDF
        const pdfBlob = await generatePDF();

        // Update status
        statusMessage.textContent = 'PDF generated. Uploading to Google Drive...';

        // Upload to Google Drive
        const formData = new FormData();
        formData.append('pdf', pdfBlob, generateFileName());

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            statusMessage.className = 'status-message success';
            statusMessage.textContent = `Success! File uploaded to Google Drive. File ID: ${result.fileId}`;

            // Reset form after successful submission
            setTimeout(() => {
                if (confirm('Form submitted successfully! Would you like to clear the form?')) {
                    document.getElementById('submissionForm').reset();
                    statusMessage.textContent = '';
                }
            }, 2000);
        } else {
            // Show detailed error message
            const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
            throw new Error(errorMsg || 'Upload failed');
        }

    } catch (error) {
        console.error('Error:', error);
        statusMessage.className = 'status-message error';
        statusMessage.textContent = `Error: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate PDF and Submit to Google Drive';
    }
});

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'letter');

    // Get form data
    const formData = new FormData(document.getElementById('submissionForm'));
    const data = Object.fromEntries(formData.entries());

    // Get all payment methods (checkboxes)
    const paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethod"]:checked'))
        .map(cb => cb.value)
        .join(', ');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let yPos = 40;

    // Title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('GARDEN STATE BRICKFACE CONTRACT SUBMISSION SHEET', pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;

    // Header Information
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date of Sale: ${data.dateOfSale || '_____________'}`, margin, yPos);
    doc.text(`Date Submitted to Office: ${data.dateSubmitted || '_____________'}`, pageWidth - margin - 200, yPos);
    yPos += 20;

    doc.text(`Sales Rep Last Name: ${data.salesRepName || '_____________'}`, margin, yPos);
    yPos += 20;

    doc.text(`Project Type: ${data.projectType || '_____________'}`, margin, yPos);
    yPos += 30;

    // Contract Information Section
    doc.setFillColor(212, 229, 212);
    doc.rect(margin, yPos - 15, pageWidth - 2 * margin, 20, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Contract Information', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    doc.setFont(undefined, 'normal');

    const contractChecklist = [
        { label: 'Signed Contract', value: data.signedContract },
        { label: 'Signed Acknowledgement Form', value: data.signedAck },
        { label: 'Measurement Worksheets and Price Breakdown Sheets', value: data.measurement },
        { label: 'Payment Schedule Breakdown is Correct', value: data.paymentSchedule },
        { label: `Payment Type: ${paymentMethods || 'N/A'}`, value: data.paymentType },
        { label: `Work Ready to Go? ${data.workReadyNote || ''}`, value: data.workReady },
        { label: 'Clear photos of all elevations', value: data.clearPhotos },
        { label: 'All colors chosen and noted', value: data.allColors }
    ];

    contractChecklist.forEach(item => {
        doc.text(`[${item.value || ' '}] ${item.label}`, margin + 20, yPos);
        yPos += 18;
    });

    yPos += 10;

    // Color and Product Type Section
    doc.setFont(undefined, 'bold');
    doc.text('Color and Product Types:', margin, yPos);
    yPos += 15;
    doc.setFont(undefined, 'normal');

    for (let i = 1; i <= 5; i++) {
        const colorProduct = data[`colorProduct${i}`];
        if (colorProduct) {
            doc.text(`${i}. ${colorProduct}`, margin + 20, yPos);
            yPos += 15;
        }
    }

    if (data.specialNotes) {
        yPos += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Special Production Notes:', margin, yPos);
        yPos += 15;
        doc.setFont(undefined, 'normal');
        const splitNotes = doc.splitTextToSize(data.specialNotes, pageWidth - 2 * margin - 20);
        doc.text(splitNotes, margin + 20, yPos);
        yPos += splitNotes.length * 12 + 10;
    }

    // Check if we need a new page
    if (yPos > 650) {
        doc.addPage();
        yPos = 40;
    }

    yPos += 10;

    // Job Cost Breakdown Section
    doc.setFillColor(232, 245, 232);
    doc.rect(margin, yPos - 15, pageWidth - 2 * margin, 20, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Job Cost Breakdown Section', pageWidth / 2, yPos, { align: 'center' });
    yPos += 25;
    doc.setFont(undefined, 'normal');

    const costItems = [
        ['Brickface and Stucco', data.brickfaceStucco],
        ['House Painting', data.housePainting],
        ['Vinyl Siding', data.vinylSiding],
        ['Windows', data.windows],
        ['Stone Veneer', data.stoneVeneer],
        ['Roofing', data.roofing],
        ['Stucco Painting', data.stuccoPainting],
        ['Gutters and Leaders', data.guttersLeaders]
    ];

    const col1X = margin + 20;
    const col2X = pageWidth / 2 + 20;
    let tempY = yPos;

    costItems.forEach((item, index) => {
        const xPos = index % 2 === 0 ? col1X : col2X;
        if (index % 2 === 0 && index > 0) tempY += 18;

        doc.text(`${item[0]}: ${item[1] ? '$' + item[1] : '$_______'}`, xPos, tempY);
        if (index % 2 === 1) tempY += 18;
    });

    yPos = tempY + 20;

    doc.setFont(undefined, 'bold');
    doc.text(`Total Contract Amount: $${data.totalContract || '_____________'}`, margin + 20, yPos);
    yPos += 30;

    // Office Only Section
    if (yPos > 600) {
        doc.addPage();
        yPos = 40;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 15, pageWidth - 2 * margin, 20, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Office Only', pageWidth / 2, yPos, { align: 'center' });
    yPos += 25;
    doc.setFont(undefined, 'normal');

    const officeItems = [
        { label: 'Entered into HouzPro', value: data.enteredHouzPro },
        { label: 'Entered Commission (Excel)', value: data.enteredCommission },
        { label: 'Entered Product Type and Work Area HouzPro', value: data.enteredProductType },
        { label: 'Entered into Sales Statistics (Excel)', value: data.enteredSalesStats },
        { label: 'Split Payment Transaction', value: data.splitPayment }
    ];

    officeItems.forEach(item => {
        doc.text(`${item.label}: ${item.value || '___'}`, margin + 20, yPos);
        yPos += 18;
    });

    yPos += 10;

    // Payment Breakdown
    if (data.checkAmount || data.creditCardAmount || data.greenskyAmount || data.aquaAmount) {
        doc.setFont(undefined, 'bold');
        doc.text('Payment Breakdown:', margin + 20, yPos);
        yPos += 15;
        doc.setFont(undefined, 'normal');

        if (data.checkAmount) {
            doc.text(`Check: $${data.checkAmount}`, margin + 40, yPos);
            yPos += 15;
        }
        if (data.creditCardAmount) {
            doc.text(`Credit Card: $${data.creditCardAmount}`, margin + 40, yPos);
            yPos += 15;
        }
        if (data.greenskyAmount) {
            doc.text(`Greensky: $${data.greenskyAmount}`, margin + 40, yPos);
            yPos += 15;
        }
        if (data.aquaAmount) {
            doc.text(`Aqua: $${data.aquaAmount}`, margin + 40, yPos);
            yPos += 15;
        }
    }

    if (data.planNumber || data.merchantFee) {
        yPos += 5;
        if (data.planNumber) {
            doc.text(`Plan #: ${data.planNumber}`, margin + 40, yPos);
            yPos += 15;
        }
        if (data.merchantFee) {
            doc.text(`Merchant Fee: ${data.merchantFee}%`, margin + 40, yPos);
        }
    }

    // Convert PDF to Blob
    return doc.output('blob');
}

function generateFileName() {
    const formData = new FormData(document.getElementById('submissionForm'));
    const salesRep = formData.get('salesRepName') || 'Unknown';
    const date = formData.get('dateOfSale') || new Date().toISOString().split('T')[0];
    const timestamp = new Date().getTime();

    return `BrickFace_Contract_${salesRep}_${date}_${timestamp}.pdf`;
}

// Auto-calculate total when cost fields change
document.querySelectorAll('.cost-row input, .cost-grid input').forEach(input => {
    input.addEventListener('input', function() {
        // Remove dollar signs and calculate
        const value = this.value.replace(/[$,]/g, '');
        if (value && !isNaN(value)) {
            this.value = value;
        }
    });
});
