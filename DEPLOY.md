# Deploying Cost Comrade to Vercel

This guide provides instructions for deploying the Cost Comrade application to Vercel.

## Prerequisites

- A Vercel account
- Node.js installed (v16.x or higher recommended)
- Git installed

## Deployment Steps

### 1. Prepare Your Repository

1. Ensure your repository is up to date with the latest changes
2. Verify that you have the following key files:
   - `vercel.json` - Contains Vercel-specific configuration
   - `package.json` - Updated with proper build and start scripts
   - `server.js` - Modified to work with Vercel's serverless functions
   - `vite.config.ts` - Configured to work with Vercel's environment

### 2. Deploy to Vercel

#### Option 1: Using the Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel
   ```

4. Follow the prompts to complete the deployment.

#### Option 2: Using the Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and log in
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Development Command: `npm run dev:all`
5. Click "Deploy"

### 3. Environment Variables

Set the following environment variables in your Vercel project settings:

- `VITE_SUPABASE_URL` - Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 4. Verify Deployment

1. Once deployed, Vercel will provide a URL for your application
2. Test the application by navigating to the URL
3. Verify that:
   - The main application loads correctly
   - API endpoints work (try the `/api/health` endpoint)
   - Product search functionality works
   - User authentication works

### 5. Custom Domain (Optional)

1. In the Vercel dashboard, go to your project settings
2. Navigate to the "Domains" section
3. Add your custom domain and follow the verification process

## Troubleshooting

### API Issues

- Check the Function Logs in Vercel dashboard
- Verify that you're using the correct API endpoints in your frontend code
- Make sure environment variables are correctly set

### Build Failures

- Check if all dependencies are properly listed in package.json
- Review build logs for specific errors
- Ensure your Node.js version is compatible with your dependencies

## Note on Mock Data

This deployment uses mock data for MaxiPali products when the real API is unavailable or returns errors. This ensures the application remains functional even when external services are down. 