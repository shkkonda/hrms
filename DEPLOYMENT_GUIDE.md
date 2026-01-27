# Deployment Guide for HRMS Application

## Step 1: Push to Your Own GitHub Repository

### 1.1 Create a New Repository on GitHub
1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it (e.g., "hrms" or "hr-management-system")
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 1.2 Remove Old Remote and Add Your Own
```bash
# Remove the old remote
git remote remove origin

# Add your new repository as origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify the remote
git remote -v
```

### 1.3 Commit and Push Your Changes
```bash
# Stage all changes
git add .

# Commit your changes
git commit -m "Initial commit: HRMS with all features implemented"

# Push to your repository
git push -u origin main
```

## Step 2: Hosting Options

### Option A: Vercel (Frontend) + Railway/Render (Backend) - Recommended

#### Frontend (Vercel)
1. Go to [Vercel](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your GitHub repository
4. Set root directory to `frontend`
5. Build command: `npm run build`
6. Output directory: `dist` (or `build` depending on your build tool)
7. Add environment variables if needed
8. Deploy!

#### Backend (Railway)
1. Go to [Railway](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `backend`
5. Add environment variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `DB_NAME`: Your database name
   - `JWT_SECRET_KEY`: A secure random string
6. Railway will auto-detect Python and install dependencies
7. Deploy!

#### Backend (Render) - Alternative
1. Go to [Render](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - Name: `hrms-backend`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy!

### Option B: Full Stack on Render
1. Deploy backend as Web Service (see above)
2. Deploy frontend as Static Site:
   - New → Static Site
   - Connect GitHub repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist` or `build`

### Option C: AWS/DigitalOcean (More Control)
- Use EC2/Droplet for backend
- Use S3/CloudFront for frontend
- More complex setup but more control

## Step 3: Environment Variables

### Backend (.env file)
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=hrms
JWT_SECRET_KEY=your-secret-key-here-change-this
```

### Frontend
Update API base URL in your API configuration to point to your deployed backend URL.

## Step 4: Update Frontend API Configuration

After deploying backend, update the frontend API base URL:

1. Find your API configuration file (usually `frontend/src/lib/api.js` or similar)
2. Update the base URL to your deployed backend URL
3. Redeploy frontend

## Step 5: MongoDB Setup

1. Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
2. Create a cluster
3. Get connection string
4. Add to environment variables

## Quick Commands Reference

```bash
# Check current remote
git remote -v

# Remove old remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to new repo
git push -u origin main

# If you need to force push (be careful!)
git push -u origin main --force
```

## Important Notes

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Update CORS settings** in backend to allow your frontend domain
3. **Use environment variables** for all sensitive data
4. **Test locally** before deploying
5. **Keep your JWT_SECRET_KEY secure** and never share it

## Troubleshooting

- **CORS errors**: Update CORS origins in `backend/server.py` to include your frontend URL
- **Build fails**: Check Node.js/Python versions match your local setup
- **Database connection**: Verify MongoDB connection string and network access
- **API not working**: Check backend URL in frontend configuration
