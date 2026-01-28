# Quick Deployment Guide

## Quick Start (5 minutes)

### Backend Deployment (Railway)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables:
   ```
   MONGO_URL=your_mongodb_connection_string
   DB_NAME=hrms
   JWT_SECRET_KEY=generate_a_random_string
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
5. Railway auto-deploys! Copy the URL.

### Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New Project" → Import from GitHub
3. Select your repository
4. Configure:
   - Root Directory: `frontend`
   - Framework: Create React App
5. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=your_railway_backend_url
   ```
6. Deploy!

## MongoDB Setup (MongoDB Atlas)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Get connection string
5. Add to Network Access (allow all IPs for testing, or specific IPs for production)

## That's it! 🚀

Your app should be live. Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
