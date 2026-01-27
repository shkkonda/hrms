# Quick Start: Push to Your Own GitHub & Deploy

## 🚀 Push to Your Own GitHub Repository

### Step 1: Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `hrms` (or your preferred name)
3. Choose Public or Private
4. **DO NOT** check "Initialize with README"
5. Click "Create repository"

### Step 2: Update Git Remote

**Option A: Using the script (Windows PowerShell)**
```powershell
# Remove old remote
git remote remove origin

# Add your new remote (replace with your username and repo name)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify
git remote -v
```

**Option B: Manual commands**
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git remote -v
```

### Step 3: Commit and Push

```bash
# Stage all changes
git add .

# Commit
git commit -m "Initial commit: HRMS with complete features"

# Push to your repository
git push -u origin main
```

If you get an error about different histories, use:
```bash
git push -u origin main --force
```
⚠️ **Warning**: Only use `--force` if you're sure you want to overwrite the remote.

## 🌐 Hosting Options

### Recommended: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository
5. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (check your `package.json`)
6. Add environment variable:
   - `VITE_API_URL` = Your backend URL (after deploying backend)
7. Deploy!

#### Backend on Railway:
1. Go to https://railway.app
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Settings:
   - **Root Directory**: `backend`
6. Add environment variables:
   - `MONGO_URL` = Your MongoDB connection string
   - `DB_NAME` = `hrms` (or your DB name)
   - `JWT_SECRET_KEY` = Generate a random secure string
7. Deploy!

### Alternative: Render (Full Stack)

#### Backend:
1. Go to https://render.com
2. "New" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - **Name**: `hrms-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as Railway)
6. Deploy!

#### Frontend:
1. "New" → "Static Site"
2. Connect GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist` or `build`

## 📋 Environment Variables Checklist

### Backend (.env or platform env vars):
- ✅ `MONGO_URL` - MongoDB connection string
- ✅ `DB_NAME` - Database name
- ✅ `JWT_SECRET_KEY` - Secret key for JWT tokens

### Frontend (if needed):
- ✅ `VITE_API_URL` or `REACT_APP_API_URL` - Backend API URL

## 🔧 After Deployment

1. **Update CORS** in `backend/server.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "http://localhost:3000",
           "https://your-frontend-url.vercel.app"  # Add your frontend URL
       ],
       # ... rest of config
   )
   ```

2. **Update API base URL** in frontend config file

3. **Test the application** end-to-end

## 📚 Need Help?

- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Common issues:
  - CORS errors → Update CORS origins
  - Build fails → Check Node.js/Python versions
  - Database connection → Verify MongoDB URL and network access
