# Deployment Setup Guide

## ✅ Backend Already Deployed
Your backend is live at: **https://hrms-aqi6.onrender.com**

## 🔧 Frontend Configuration

### 1. Environment Variables
The frontend API is configured to use your backend URL. The code has a fallback, but for best practices:

**For Local Development:**
Create `frontend/.env` file:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**For Production Deployment:**
Set the environment variable in your hosting platform:
- **Vercel**: Add `REACT_APP_BACKEND_URL=https://hrms-aqi6.onrender.com` in Project Settings → Environment Variables
- **Netlify**: Add in Site Settings → Environment Variables
- **Other platforms**: Add as environment variable

### 2. Backend CORS Configuration
Make sure your backend CORS allows your frontend domain. Update the `CORS_ORIGINS` environment variable on Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to Environment tab
4. Add/Update: `CORS_ORIGINS` = `https://your-frontend-domain.vercel.app,http://localhost:3000`
   - Replace `your-frontend-domain.vercel.app` with your actual frontend URL after deployment

## 🚀 Deploy Frontend to Vercel

### Step 1: Push to GitHub
```bash
# Make sure you're in the root directory
cd C:\Users\JASWANTH\hrms

# Remove old remote (if not done already)
git remote remove origin

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Stage, commit, and push
git add .
git commit -m "Complete HRMS application ready for deployment"
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [Vercel](https://vercel.com) and sign up/login with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install --legacy-peer-deps`
5. Add Environment Variable:
   - **Name**: `REACT_APP_BACKEND_URL`
   - **Value**: `https://hrms-aqi6.onrender.com`
6. Click **"Deploy"**

### Step 3: Update Backend CORS
After Vercel deployment, you'll get a URL like `https://your-app.vercel.app`

1. Go to Render dashboard → Your backend service → Environment
2. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   https://your-app.vercel.app,http://localhost:3000
   ```
3. Redeploy your backend service (or it will auto-update)

## 🧪 Testing

### Test Backend Connection
Visit: `https://hrms-aqi6.onrender.com/api/health` (if you have a health endpoint)
Or test with: `https://hrms-aqi6.onrender.com/docs` (FastAPI docs)

### Test Frontend
1. Deploy frontend to Vercel
2. Visit your Vercel URL
3. Try logging in
4. Check browser console for any CORS errors

## 📝 Quick Checklist

- [x] Backend deployed on Render
- [ ] Frontend code pushed to GitHub
- [ ] Frontend deployed on Vercel
- [ ] Environment variable `REACT_APP_BACKEND_URL` set in Vercel
- [ ] Backend `CORS_ORIGINS` updated with frontend URL
- [ ] Test login functionality
- [ ] Test all features end-to-end

## 🔍 Troubleshooting

### CORS Errors
- **Symptom**: Browser console shows CORS errors
- **Fix**: Update `CORS_ORIGINS` in Render backend environment variables

### API Connection Failed
- **Symptom**: "Failed to fetch" or network errors
- **Fix**: 
  1. Check `REACT_APP_BACKEND_URL` is set correctly
  2. Verify backend is running: Visit `https://hrms-aqi6.onrender.com/docs`
  3. Check backend logs in Render dashboard

### Build Fails on Vercel
- **Symptom**: Build fails during deployment
- **Fix**: 
  1. Check "Install Command" is set to `npm install --legacy-peer-deps`
  2. Verify Node.js version (should be 18+)
  3. Check build logs for specific errors

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
