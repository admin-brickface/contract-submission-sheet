const { google } = require('googleapis');
const formidable = require('formidable');
const fs = require('fs');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const pdfFile = files.pdf;

    if (!pdfFile) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Set up Google Drive API authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Read the file
    const fileBuffer = fs.readFileSync(pdfFile[0].filepath);

    // Upload to Google Drive
    const fileMetadata = {
      name: pdfFile[0].originalFilename || 'contract_submission.pdf',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Optional: specify folder ID
    };

    const media = {
      mimeType: 'application/pdf',
      body: require('stream').Readable.from(fileBuffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    // Clean up temporary file
    fs.unlinkSync(pdfFile[0].filepath);

    return res.status(200).json({
      success: true,
      fileId: file.data.id,
      fileName: file.data.name,
      webViewLink: file.data.webViewLink,
      message: 'File uploaded successfully to Google Drive',
    });

  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return res.status(500).json({
      error: 'Failed to upload file to Google Drive',
      details: error.message,
    });
  }
}
