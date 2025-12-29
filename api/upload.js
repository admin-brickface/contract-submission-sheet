aconst { google } = require('googleapis');
const { IncomingForm } = require('formidable');
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
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Handle both array and single file formats
    let pdfFile = files.pdf;
    if (Array.isArray(pdfFile)) {
      pdfFile = pdfFile[0];
    }

    if (!pdfFile) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Verify environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing Google credentials');
      return res.status(500).json({
        error: 'Server configuration error: Missing Google Drive credentials',
        details: 'Please configure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel environment variables'
      });
    }

    // Verify folder ID is set
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.error('Missing folder ID');
      return res.status(500).json({
        error: 'Server configuration error: Missing Google Drive Folder ID',
        details: 'Please configure GOOGLE_DRIVE_FOLDER_ID in Vercel environment variables'
      });
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

    // Verify access to the folder
    try {
      await drive.files.get({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        fields: 'id, name',
      });
    } catch (folderError) {
      console.error('Cannot access folder:', folderError);
      return res.status(500).json({
        error: 'Cannot access Google Drive folder',
        details: `The service account cannot access the folder. Please verify: 1) The folder ID is correct, 2) The folder is shared with ${process.env.GOOGLE_CLIENT_EMAIL} with Editor permissions`
      });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(pdfFile.filepath);

    // Upload to Google Drive
    const fileMetadata = {
      name: pdfFile.originalFilename || 'contract_submission.pdf',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
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
    try {
      fs.unlinkSync(pdfFile.filepath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
      // Don't fail the request if cleanup fails
    }

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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
