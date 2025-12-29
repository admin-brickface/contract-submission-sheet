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
        scale: 1, // Reduced from 2 to lower file size
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
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Calculate scaling
    const pdfWidth = pageWidth - (2 * margin);
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageContentHeight = pageHeight - (2 * margin);

    // Calculate how many pages we need
    const pageCount = Math.ceil(pdfHeight / pageContentHeight);

    // Split canvas into chunks and add each to a page
    for (let i = 0; i < pageCount; i++) {
        if (i > 0) {
            doc.addPage();
        }

        // Calculate which part of the canvas to show
        const sourceY = (i * pageContentHeight * canvas.width) / pdfWidth;
        const sourceHeight = (pageContentHeight * canvas.width) / pdfWidth;

        // Create a temporary canvas for this page section
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);

        // Draw the section of the original canvas
        tempCtx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, tempCanvas.height,
            0, 0,
            canvas.width, tempCanvas.height
        );

        // Convert to image and add to PDF
        const pageImgData = tempCanvas.toDataURL('image/jpeg', 0.7);
        const imgHeight = (tempCanvas.height * pdfWidth) / canvas.width;

        doc.addImage(pageImgData, 'JPEG', margin, margin, pdfWidth, imgHeight, undefined, 'FAST');
    }

    return doc.output('blob');
}

function generateFileName() {
    const formData = new FormData(document.getElementById('submissionForm'));
    const customerName = formData.get('customerName') || 'Unknown';
    const date = formData.get('dateOfSale') || new Date().toISOString().split('T')[0];

    // Replace spaces with underscores and remove special characters
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');

    return `BrickFace_Contract_${sanitizedName}_${date}.pdf`;
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
