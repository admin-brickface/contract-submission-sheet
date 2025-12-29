# Garden State BrickFace Contract Submission Form

A web-based form for submitting contract information that generates a PDF and automatically uploads it to Google Drive.

## Features

- Interactive web form matching the original contract submission sheet
- Client-side PDF generation using jsPDF
- Automatic upload to Google Drive
- Responsive design for mobile and desktop
- Form validation
- Status notifications

## Prerequisites

- Node.js (v14 or higher)
- A Google Cloud Project with Drive API enabled
- A Vercel account (for deployment)
- Git

## Google Drive API Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### Step 2: Create Service Account Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `brickface-form-upload` (or your preferred name)
   - Description: "Service account for BrickFace form uploads"
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

### Step 3: Generate Service Account Key

1. Click on the newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - a JSON file will be downloaded

### Step 4: Share Google Drive Folder

1. Create a folder in your Google Drive where you want to store the submitted forms
2. Right-click the folder > "Share"
3. Add the service account email (found in the JSON file as `client_email`)
4. Give it "Editor" permissions
5. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

## Local Development Setup

1. Clone this repository:
```bash
git clone <your-repo-url>
cd contract-submission-sheet
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials from the downloaded JSON file:
```env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

**Important:** Keep the quotes around `GOOGLE_PRIVATE_KEY` and include the `\n` characters for line breaks.

5. Run the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Deployment to Vercel

### Step 1: Push to GitHub

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repository on GitHub

3. Push your code:
```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset:** Other
   - **Build Command:** Leave default or use `npm run build`
   - **Output Directory:** Leave default

### Step 3: Add Environment Variables in Vercel

1. In your Vercel project, go to "Settings" > "Environment Variables"
2. Add the following variables:

   - **Name:** `GOOGLE_CLIENT_EMAIL`
     - **Value:** Your service account email from the JSON file

   - **Name:** `GOOGLE_PRIVATE_KEY`
     - **Value:** Your private key from the JSON file
     - **Important:** Copy the entire private key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts
     - Make sure to include all the `\n` characters

   - **Name:** `GOOGLE_DRIVE_FOLDER_ID`
     - **Value:** Your Google Drive folder ID

3. Click "Save" for each variable

### Step 4: Deploy

1. Click "Deploy" or push a new commit to trigger a deployment
2. Once deployed, Vercel will provide you with a URL (e.g., `https://your-project.vercel.app`)

## Usage

1. Navigate to your deployed URL
2. Fill out the contract submission form
3. Click "Generate PDF and Submit to Google Drive"
4. The form will:
   - Generate a PDF of the submitted information
   - Upload it to your specified Google Drive folder
   - Display a success message with the file ID

## File Structure

```
contract-submission-sheet/
├── api/
│   └── upload.js          # Vercel serverless function for Google Drive upload
├── index.html             # Main form HTML
├── styles.css             # Form styling
├── script.js              # Client-side JavaScript and PDF generation
├── package.json           # Node.js dependencies
├── vercel.json            # Vercel configuration
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## Troubleshooting

### "Failed to upload file to Google Drive" Error

- Check that your service account email has access to the Google Drive folder
- Verify that the Google Drive API is enabled in your Google Cloud Project
- Ensure environment variables are correctly set in Vercel
- Check that the private key includes all newline characters (`\n`)

### PDF Generation Issues

- Ensure all required fields are filled out
- Check browser console for JavaScript errors
- Try in a different browser

### Local Development Not Working

- Run `npm install` to ensure all dependencies are installed
- Check that your `.env` file is in the root directory
- Verify the `.env` file has the correct format with quotes around the private key

## Security Notes

- Never commit your `.env` file or Google service account credentials to Git
- The `.gitignore` file is configured to exclude sensitive files
- Keep your service account key secure
- Regularly rotate your service account keys for better security

## Customization

### Changing Form Fields

Edit `index.html` to add, remove, or modify form fields.

### Modifying PDF Layout

Edit the `generatePDF()` function in `script.js` to change how the PDF is generated.

### Styling Changes

Edit `styles.css` to customize the form's appearance.

## Support

For issues or questions, please create an issue in the GitHub repository.

## License

MIT