# 🚀 Complete Deployment Guide - Option 1

**Stack: Vercel (Frontend) + Render (Backend) + MongoDB Atlas (Database)**

## Step 1: Prepare MongoDB Atlas (Database) - 15 minutes

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Choose **Free Shared Cluster** (M0)
4. Select provider: **AWS** (or any)
5. Region: Choose closest to you (e.g., **US East** or **Singapore**)
6. Cluster Name: `bookstore-cluster`
7. Click **Create**

### 1.2 Create Database User
1. Click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Authentication: **Password**
4. Username: `bookstore_user`
5. Password: Generate a secure password (save it!)
6. User Privileges: **Read and write to any database**
7. Click **Add User**

### 1.3 Allow Network Access
1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - ⚠️ Required for Render/Vercel to connect
4. Click **Confirm**

### 1.4 Get Connection String
1. Click **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Node.js**
5. Copy the connection string, looks like:
   ```
   mongodb+srv://bookstore_user:<password>@bookstore-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   mongodb+srv://cuchum260902_db_user:<db_password>@bookstore-cluster.k6ogdq2.mongodb.net/?appName=bookstore-cluster
6. Replace `<password>` with your actual password
7. Add database name at the end: `/bookstore`
   ```
   mongodb+srv://bookstore_user:YOUR_PASSWORD@bookstore-cluster.xxxxx.mongodb.net/bookstore?retryWrites=true&w=majority
   ```

✅ **Save this connection string - you'll need it soon!**

---

## Step 2: Deploy Backend to Render - 20 minutes

### 2.1 Prepare Your Repository
1. Make sure your code is pushed to GitHub
2. If not, create a new GitHub repository:
   ```bash
   cd d:\Workspace\itc\HK5\cdbe
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/bookstore.git
   git push -u origin main
   ```

### 2.2 Create Render Account
1. Go to https://render.com
2. Sign up with **GitHub** account
3. Authorize Render to access your repositories

### 2.3 Deploy Backend
1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Select your `bookstore` repository
4. Configure:

**Basic Settings:**
```
Name: bookstore-api
Region: Choose closest (e.g., Oregon, Singapore)
Branch: main
Root Directory: be
Runtime: Node
```

**Build & Deploy:**
```
Build Command: npm install
Start Command: npm start
```

**Instance Type:**
```
Free
```

5. Click **Advanced** to add environment variables

### 2.4 Add Environment Variables

Click **Add Environment Variable** for each:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://bookstore_user:YOUR_PASSWORD@bookstore-cluster.xxxxx.mongodb.net/bookstore?retryWrites=true&w=majority
DB_NAME=bookstore
JWT_SECRET=your_super_secret_jwt_key_change_this_random_string_12345
JWT_EXPIRE=30d
ADMIN_EMAIL=admin@bookstore.com
ADMIN_PASSWORD=admin123
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
YOUR_DOMAIN=https://your-app-name.vercel.app
```

⚠️ **Important:**
- Replace `MONGODB_URI` with your actual connection string from Step 1.4
- Change `JWT_SECRET` to a random secure string
- Update PayOS credentials if you have them (or leave placeholder)
- We'll update `YOUR_DOMAIN` after deploying frontend

6. Click **Create Web Service**

### 2.5 Wait for Deployment
- First build takes 2-3 minutes
- Watch the logs for any errors
- When you see "✅ Connected to MongoDB" - it's working!

### 2.6 Test Your Backend
1. Copy your backend URL (e.g., `https://bookstore-api.onrender.com`)
2. Visit: `https://bookstore-api.onrender.com/api/health`
3. Should see:
   ```json
   {
     "status": "OK",
     "timestamp": "2026-01-08T...",
     "uptime": 123.45
   }
   ```

✅ **Backend is live! Copy your URL - you'll need it for frontend.**

---

## Step 3: Deploy Frontend to Vercel - 15 minutes

### 3.1 Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with **GitHub** account
3. Authorize Vercel

### 3.2 Deploy Frontend
1. Click **Add New...** → **Project**
2. Import your GitHub repository
3. Select your `bookstore` repository
4. Configure:

**Framework Preset:**
```
Vite
```

**Root Directory:**
```
Click "Edit" → Type: fe → Confirm
```

**Build Settings:**
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3.3 Add Environment Variables
Click **Environment Variables**:

```env
VITE_API_URL=https://bookstore-api.onrender.com/api
```

⚠️ Replace `bookstore-api.onrender.com` with YOUR actual Render backend URL from Step 2.6

### 3.4 Deploy
1. Click **Deploy**
2. Wait 2-3 minutes
3. You'll get a URL like: `https://bookstore-xyz123.vercel.app`

### 3.5 Test Your Frontend
1. Visit your Vercel URL
2. Should see your homepage
3. Try logging in with admin credentials:
   - Email: `admin@bookstore.com`
   - Password: `admin123`

---

## Step 4: Update Backend Environment - 5 minutes

### 4.1 Update YOUR_DOMAIN in Render
1. Go back to Render dashboard
2. Click your **bookstore-api** service
3. Click **Environment** (left sidebar)
4. Find `YOUR_DOMAIN`
5. Update to your Vercel URL: `https://bookstore-xyz123.vercel.app`
6. Click **Save Changes**
7. Wait for auto-redeploy (1-2 minutes)

### 4.2 Seed Your Database (Optional)
If you want sample data:

1. In Render dashboard, go to **Shell** tab
2. Run:
   ```bash
   npm run db:setup
   ```
3. Wait for completion (1-2 minutes)
4. You'll have sample books and users

---

## Step 5: Configure Custom Domain (Optional) - 10 minutes

### On Vercel (Frontend):
1. Go to your project → **Settings** → **Domains**
2. Add your domain (e.g., `mybookstore.com`)
3. Follow DNS instructions from your domain registrar

### On Render (Backend):
1. Go to your service → **Settings** → **Custom Domain**
2. Add subdomain (e.g., `api.mybookstore.com`)
3. Add CNAME record at your DNS provider

---

## Step 6: Setup PayOS Webhook - 5 minutes

1. Login to PayOS dashboard
2. Go to **Webhooks** settings
3. Add webhook URL: `https://bookstore-api.onrender.com/api/payment/payos-webhook`
4. Save

---

## 🎉 You're Live! What's Next?

### Your Live URLs:
- 🌐 **Frontend:** `https://your-app.vercel.app`
- 🔧 **Backend:** `https://bookstore-api.onrender.com`
- 📊 **API Docs:** `https://bookstore-api.onrender.com/api-docs`

### Default Login:
- Email: `admin@bookstore.com`
- Password: `admin123`

⚠️ **Change admin password immediately after first login!**

---

## 📝 Important Notes & Limitations

### Free Tier Limitations:

**Render Backend:**
- ⏰ Sleeps after 15 minutes of inactivity
- 🐌 50 second cold start on first request
- 💾 750 hours/month (enough for 24/7 for 1 month)
- 🔄 Auto-wakes on any request

**MongoDB Atlas:**
- 💿 512MB storage limit
- 🔌 500 concurrent connections max
- ⚡ Shared CPU (slower than paid)

**Vercel:**
- 📦 100GB bandwidth/month
- ⚡ Unlimited builds
- 🚀 Always fast (no sleep)

### Cold Start Mitigation:
Add this to notes:
```
Tip: Use a cron job service (cron-job.org) to ping your backend every 14 minutes
URL to ping: https://bookstore-api.onrender.com/api/health
```

---

## 🔧 Useful Commands After Deployment

### View Logs:
- **Render:** Dashboard → Your service → Logs tab
- **Vercel:** Dashboard → Your project → Deployments → View logs

### Redeploy:
- **Render:** Auto-deploys on every git push to main
- **Vercel:** Auto-deploys on every git push to main

### Manual Deploy:
- **Render:** Dashboard → Manual Deploy → Deploy latest commit
- **Vercel:** Dashboard → Deployments → Redeploy

---

## 🆘 Troubleshooting

### Backend not connecting to MongoDB:
```
Check: MONGODB_URI is correct
Check: IP whitelist includes 0.0.0.0/0
Check: Database user has correct password
```

### Frontend can't reach backend:
```
Check: VITE_API_URL is correct (includes /api)
Check: Backend CORS allows your frontend domain
Check: Backend is awake (visit /api/health)
```

### Build fails:
```
Check: package.json has correct scripts
Check: All dependencies are in dependencies (not devDependencies)
Check: Node version compatibility
```

---

## 📊 Monitoring Your App

### Check Backend Health:
```bash
curl https://bookstore-api.onrender.com/api/health
```

### Check Database Connection:
Go to MongoDB Atlas → Database → Collections → See your data

### Check Frontend:
Just visit your Vercel URL

---

## 📈 When to Upgrade

### Upgrade MongoDB Atlas ($9/month) when:
- Storage exceeds 400MB
- Need better performance
- Have consistent traffic

### Upgrade to Railway ($5+/month) when:
- Can't tolerate 50s cold starts
- Have regular users
- Need always-on backend

### Upgrade Vercel ($20/month) when:
- Bandwidth exceeds 100GB/month
- Need commercial use
- Want priority support

---

## 🚀 Performance Optimization Tips

1. **Enable caching** on Vercel for static assets
2. **Compress images** before uploading (use Cloudinary)
3. **Minimize API calls** from frontend
4. **Use MongoDB indexes** for faster queries
5. **Keep backend warm** with cron jobs

---

**Total Deployment Time:** ~60-75 minutes  
**Monthly Cost:** $0  
**Upgrade Path:** MongoDB Atlas → Railway → Vercel Pro
