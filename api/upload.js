const { google } = require('googleapis');
const { IncomingForm } = require('formidable');
const fs = require('fs');
const stream = require('stream');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Set response headers
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('Missing Google credentials');
      return res.status(500).json({
        error: 'Server configuration error: Missing Google Drive credentials',
        details: 'Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in Vercel environment variables'
      });
    }

    // Set up Google Drive API authentication with OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // redirect URL
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Test authentication before proceeding
    try {
      await oauth2Client.getAccessToken();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(500).json({
        error: 'Google Drive authentication failed',
        details: 'Your refresh token may have expired. Please regenerate it using the OAuth Playground and update the GOOGLE_REFRESH_TOKEN environment variable in Vercel.'
      });
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Read the file
    const fileBuffer = fs.readFileSync(pdfFile.filepath);

    // Upload to Google Drive
    const fileMetadata = {
      name: pdfFile.originalFilename || 'contract_submission.pdf',
    };

    // Only add parents if folder ID is provided
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
    }

    const media = {
      mimeType: 'application/pdf',
      body: stream.Readable.from(fileBuffer),
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
};
