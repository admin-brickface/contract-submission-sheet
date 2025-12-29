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

        // Debug: Check response content type
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);

        // Try to get the response text first
        const responseText = await response.text();
        console.log('Response text:', responseText);

        // Try to parse as JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}`);
        }

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
    // Hide the submit button and status message before generating PDF
    const submitSection = document.querySelector('.submit-section');
    submitSection.style.display = 'none';

    // Make all form inputs readonly to show filled-in appearance
    const allInputs = document.querySelectorAll('#submissionForm input, #submissionForm textarea');
    allInputs.forEach(input => {
        input.setAttribute('readonly', true);
        input.style.backgroundColor = '#f9f9f9';
        input.style.cursor = 'default';
    });

    // For radio buttons and checkboxes, add visual indicator
    const checkedRadios = document.querySelectorAll('input[type="radio"]:checked');
    checkedRadios.forEach(radio => {
        radio.style.accentColor = '#000';
    });

    // Use html2canvas to capture the form
    const formElement = document.getElementById('submissionForm');
    const canvas = await html2canvas(formElement, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        windowWidth: 900,
        backgroundColor: '#ffffff'
    });

    // Reset the form display
    submitSection.style.display = 'block';
    allInputs.forEach(input => {
        input.removeAttribute('readonly');
        input.style.backgroundColor = '';
        input.style.cursor = '';
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Calculate dimensions to fit the page
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // Add first page
    doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20); // Account for margins

    // Add more pages if content exceeds one page
    while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10; // 10mm top margin for new page
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
    }

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
