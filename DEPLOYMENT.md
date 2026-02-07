# HRMS Deployment Guide

This guide will help you deploy your HRMS application to production. The application consists of:
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React application

## Prerequisites

- Git repository pushed to GitHub/GitLab/Bitbucket
- MongoDB database (MongoDB Atlas recommended for cloud deployment)
- Accounts on deployment platforms:
  - **Frontend**: Vercel (recommended) or Netlify
  - **Backend**: Railway, Render, or Heroku

## Environment Variables

### Backend Environment Variables

You'll need to set these in your backend deployment platform:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=hrms
JWT_SECRET_KEY=your-secret-key-here (generate a strong random string)
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000
```

### Frontend Environment Variables

Set these in your frontend deployment platform:

```
REACT_APP_BACKEND_URL=https://your-backend-url.railway.app
```

## Deployment Options

### Option 1: Railway (Recommended for Backend)

Railway is easy to use and offers a free tier.

#### Steps:

1. **Sign up** at [railway.app](https://railway.app)

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Backend Service**
   - Railway will detect the `backend/` directory
   - Or manually set the root directory to `backend`
   - Add environment variables (see above)

4. **Deploy**
   - Railway will automatically build and deploy
   - Note the generated URL (e.g., `https://your-app.railway.app`)

5. **Set up MongoDB**
   - Use MongoDB Atlas (free tier available)
   - Create a cluster and get connection string
   - Add to `MONGO_URL` environment variable

### Option 2: Render (Alternative for Backend)

1. **Sign up** at [render.com](https://render.com)

2. **Create a New Web Service**
   - Connect your GitHub repository
   - Set:
     - **Root Directory**: `backend`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**
   - Go to Environment section
   - Add all required variables (see above)

4. **Deploy**
   - Render will automatically deploy on push

### Option 3: Docker Deployment

If you prefer Docker, you can deploy to any platform that supports Docker:

1. **Build the Docker image**:
   ```bash
   cd backend
   docker build -t hrms-backend .
   ```

2. **Run locally** (for testing):
   ```bash
   docker run -p 8000:8000 \
     -e MONGO_URL=your_mongo_url \
     -e DB_NAME=hrms \
     -e JWT_SECRET_KEY=your_secret \
     -e CORS_ORIGINS=http://localhost:3000 \
     hrms-backend
   ```

3. **Deploy to platforms**:
   - **Fly.io**: `flyctl launch`
   - **DigitalOcean App Platform**: Connect repo and select Dockerfile
   - **AWS ECS/Fargate**: Use AWS CLI or Console

## Frontend Deployment (Vercel)

### Steps:

1. **Sign up** at [vercel.com](https://vercel.com)

2. **Import Project**
   - Click "Add New Project"
   - Import from GitHub
   - Select your repository

3. **Configure Project**
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add: `REACT_APP_BACKEND_URL` = your backend URL

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Alternative: Netlify

1. Sign up at [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Set:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
4. Add environment variable: `REACT_APP_BACKEND_URL`

## Post-Deployment Checklist

- [ ] Backend is accessible and returning responses
- [ ] Frontend can connect to backend (check browser console)
- [ ] CORS is properly configured (backend allows frontend origin)
- [ ] MongoDB connection is working
- [ ] Environment variables are set correctly
- [ ] Test authentication flow (login/register)
- [ ] Test API endpoints

## Troubleshooting

### Backend Issues

**Problem**: Backend not starting
- Check logs in your deployment platform
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

**Problem**: CORS errors
- Verify `CORS_ORIGINS` includes your frontend URL
- Check that frontend URL matches exactly (including https/http)

**Problem**: Database connection failed
- Verify MongoDB Atlas network access allows your deployment IP
- Check MongoDB connection string format
- Ensure database user has proper permissions

### Frontend Issues

**Problem**: Can't connect to backend
- Verify `REACT_APP_BACKEND_URL` is set correctly
- Check backend URL is accessible
- Verify CORS configuration on backend

**Problem**: Build fails
- Check Node.js version compatibility
- Try `npm install --legacy-peer-deps` locally
- Review build logs for specific errors

## Continuous Deployment

Both Vercel and Railway automatically deploy on every push to your main branch. For other branches, you can configure preview deployments.

## Security Notes

- Never commit `.env` files
- Use strong, randomly generated `JWT_SECRET_KEY`
- Restrict MongoDB network access to your deployment IPs
- Use HTTPS in production (automatically handled by Vercel/Railway)
- Regularly update dependencies for security patches

## Cost Estimation

- **Vercel**: Free tier available (suitable for most projects)
- **Railway**: Free tier with $5 credit/month
- **Render**: Free tier available (with limitations)
- **MongoDB Atlas**: Free tier (M0 cluster) available

## Support

If you encounter issues:
1. Check deployment platform logs
2. Verify environment variables
3. Test API endpoints directly (using Postman/curl)
4. Check browser console for frontend errors
