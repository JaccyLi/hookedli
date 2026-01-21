# 🔒 HookedLee Backend Setup & Deployment Guide

## 📋 Overview

This guide walks you through setting up the secure backend server for the HookedLee WeChat Mini Program. The backend securely stores API keys and proxies all AI requests, keeping your credentials safe.

---

## 🎯 Architecture Overview

```
WeChat Mini Program
    ↓
Backend Server (Your Server)
    ↓
AI APIs (BigModel, DeepSeek)
```

**Why This Architecture?**
- ✅ API keys never stored in mini program code
- ✅ Keys never exposed to client devices
- ✅ Centralized API management
- ✅ Rate limiting and abuse prevention
- ✅ Easy to rotate keys without updating mini program

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Prepare Your API Keys

Get your API keys from the providers:

**BigModel (GLM-4.7 + Image Generation):**
- Visit: https://open.bigmodel.cn/
- Register/Login
- Get your API key from the console

**DeepSeek (DeepSeek-Chat + DeepSeek-Reasoner):**
- Visit: https://platform.deepseek.com/
- Register/Login
- Get your API key from the API keys section

### Step 2: Deploy the Backend

Choose one of these easy deployment options:

#### Option A: Deploy to Railway (Recommended - Free Tier Available)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   cd backend
   railway init
   ```

4. **Add Environment Variables:**
   - Go to https://railway.app/
   - Find your project
   - Go to "Variables" tab
   - Add:
     - `BIGMODEL_API_KEY` = your BigModel key
     - `DEEPSEEK_API_KEY` = your DeepSeek key

5. **Deploy:**
   ```bash
   railway up
   ```

6. **Get Your Backend URL:**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Copy this URL

#### Option B: Deploy to Vercel (Free)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd backend
   vercel
   ```

3. **Set Environment Variables:**
   - Go to https://vercel.com/dashboard
   - Find your project
   - Go to "Settings" → "Environment Variables"
   - Add:
     - `BIGMODEL_API_KEY`
     - `DEEPSEEK_API_KEY`

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

5. **Get Your Backend URL:**
   - Vercel will provide a URL like: `https://your-project.vercel.app`

#### Option C: Run Locally (For Testing)

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   nano .env
   ```

3. **Start Server:**
   ```bash
   npm start
   ```

4. **Server runs on:** `http://localhost:3000`

   ⚠️ **Note:** Local deployment requires ngrok or similar for WeChat Mini Program access

### Step 3: Configure Mini Program

1. **Open WeChat Developer Tools**
2. **Open Settings Page** in the mini program
3. **Enter Backend URL:**
   - Example: `https://your-app.railway.app`
   - Or: `https://your-project.vercel.app`
4. **Click "Test Connection"**
5. **✅ If successful, you'll see "Backend Connected!"**

---

## 📖 Detailed Setup

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# API Keys (Get these from the providers)
BIGMODEL_API_KEY=your_bigmodel_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
```

**Security Notes:**
- ❌ Never commit `.env` to git
- ✅ Use `.env.example` as a template
- ✅ Rotate keys periodically
- ✅ Use different keys for dev/prod

### WeChat Mini Program Configuration

In the mini program settings page:

1. **Backend URL Format:**
   - Must include protocol: `https://` (required for WeChat)
   - No trailing slash: `https://your-backend.com` ✅
   - Wrong: `your-backend.com` ❌
   - Wrong: `https://your-backend.com/` ❌

2. **Test Connection:**
   - Click "Test Connection" button
   - Should see "✓ Connected" if successful
   - Backend URL is saved automatically

3. **Troubleshooting:**
   - Make sure backend is running
   - Check firewall allows HTTPS
   - Verify DNS resolves correctly

---

## 🏗️ Advanced Deployment

### Deploy to AWS EC2

#### 1. Launch EC2 Instance

```bash
# Ubuntu 22.04 LTS recommended
# Instance type: t3.micro (free tier) or t3.small (paid)
# Security Group: Allow HTTP (80) and HTTPS (443)
```

#### 2. Connect to Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 4. Clone Repository

```bash
git clone <your-repo-url>
cd hookedlee/backend
npm install
```

#### 5. Configure Environment

```bash
cp .env.example .env
nano .env
# Add your API keys
```

#### 6. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

#### 7. Start Server with PM2

```bash
pm2 start server.js --name hookedlee-backend
pm2 save
pm2 startup
```

#### 8. Setup Nginx Reverse Proxy

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/hookedlee
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/hookedlee /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. Setup SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Deploy to DigitalOcean

1. **Create Droplet:**
   - Ubuntu 22.04 LTS
   - Basic plan ($4-6/month)
   - Enable IPv6

2. **Follow EC2 steps 2-9** (same process)

### Deploy to Google Cloud Run

1. **Create `Dockerfile`:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Deploy:**
   ```bash
   gcloud run deploy hookedlee-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

3. **Set environment variables in Google Cloud Console**

---

## 🔧 Backend Configuration

### Rate Limiting

Edit `server.js` to adjust rate limits:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                     // Max requests per window
  message: { error: 'Too many requests' }
})
```

### CORS Configuration

For WeChat Mini Program, CORS is already enabled:

```javascript
app.use(cors({
  origin: '*',  // WeChat requires this
  credentials: true
}))
```

### Monitoring

Add logging to track usage:

```javascript
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})
```

---

## 🧪 Testing

### Test Backend Health

```bash
curl https://your-backend.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "models": {
    "bigmodel": true,
    "deepseek": true
  }
}
```

### Test Chat Completion

```bash
curl -X POST https://your-backend.com/api/proxy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Test Image Generation

```bash
curl -X POST https://your-backend.com/api/proxy/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful mountain landscape",
    "size": "1024x1024"
  }'
```

### Test from Mini Program

1. Open WeChat Developer Tools
2. Run mini program
3. Go to Settings
4. Enter backend URL
5. Click "Test Connection"
6. Try generating an article

---

## 🔒 Security Best Practices

### 1. API Key Management

✅ **DO:**
- Store keys in environment variables
- Rotate keys regularly
- Use different keys for dev/staging/prod
- Monitor API usage
- Set spending limits

❌ **DON'T:**
- Commit keys to git
- Share keys in chat/email
- Hardcode keys in source
- Use production keys for development

### 2. Server Security

✅ **DO:**
- Keep server updated (`apt update && apt upgrade`)
- Use HTTPS (SSL/TLS)
- Enable firewall (UFW/Security Groups)
- Monitor logs for suspicious activity
- Set up automatic backups

❌ **DON'T:**
- Run as root user
- Expose unnecessary ports
- Ignore security updates
- Leave default passwords

### 3. Rate Limiting

Protect against abuse:
- Set reasonable rate limits
- Monitor API usage patterns
- Block suspicious IPs
- Implement caching where appropriate

---

## 📊 Monitoring & Maintenance

### Health Monitoring

Create a simple health check:

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="https://your-backend.com/api/health"
RESPONSE=$(curl -s $HEALTH_URL)

if echo $RESPONSE | grep -q '"status":"ok"'; then
  echo "✓ Backend is healthy"
  exit 0
else
  echo "✗ Backend is down!"
  # Send alert (email, Slack, etc.)
  exit 1
fi
```

Run periodically:
```bash
# Add to crontab
crontab -e

# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh
```

### Log Monitoring

View logs:
```bash
# PM2
pm2 logs hookedlee-backend

# Docker
docker logs -f hookedlee-backend

# Systemd
journalctl -u hookedlee-backend -f
```

### Usage Monitoring

Track API usage:
- BigModel Console: https://open.bigmodel.cn/dashboard
- DeepSeek Console: https://platform.deepseek.com/user/info

---

## 🆘 Troubleshooting

### Issue: "Backend connection failed"

**Solutions:**
1. Check backend is running
2. Verify URL is correct (includes https://)
3. Check firewall settings
4. Try accessing backend URL in browser
5. Check WeChat Mini Program server whitelist

### Issue: "API request failed"

**Solutions:**
1. Verify API keys are set correctly
2. Check API key has credits/quota
3. Review backend logs for errors
4. Test API directly (curl command)
5. Check rate limits

### Issue: "CORS error"

**Solutions:**
1. Ensure backend URL uses HTTPS
2. Verify CORS is enabled in backend
3. Check WeChat Mini Program settings
4. Add domain to WeChat whitelist

### Issue: "Image generation failed"

**Solutions:**
1. BigModel image API may be down
2. Check prompt content (some content blocked)
3. Verify BIGMODEL_API_KEY is set
4. Try again (temporary API issues)

---

## 📈 Scaling Considerations

### When to Scale Up

**Signs you need more capacity:**
- Slow response times
- Rate limit errors
- High CPU/memory usage
- Failed requests

### Scaling Options

**Vertical Scaling:**
- Upgrade server (more CPU/RAM)
- Cheaper for small scale
- Easy to implement

**Horizontal Scaling:**
- Load balancer + multiple servers
- Better for high availability
- More complex setup

**Managed Services:**
- AWS API Gateway + Lambda
- Google Cloud Run
- Azure Functions
- Auto-scaling included

---

## 💰 Cost Optimization

### Free Tier Options

| Service | Free Tier | Cost After |
|---------|-----------|-------------|
| Railway | $5/month credit | Then pay-as-you-go |
| Vercel | Unlimited | Then pay-as-you-go |
| AWS EC2 | 750 hours/month | Then ~$6-15/month |
| DigitalOcean | None | $4-6/month |
| Google Cloud Run | 2M requests/month | Then pay-as-you-go |

### Cost Estimation

**For 1000 users/day:**
- API calls: ~$10-50/month (depends on AI provider)
- Server: $5-20/month
- **Total: ~$15-70/month**

**For 10,000 users/day:**
- API calls: ~$100-500/month
- Server: $20-100/month
- **Total: ~$120-600/month**

---

## 🎓 Resources

### Documentation
- [BigModel API Docs](https://open.bigmodel.cn/dev/api)
- [DeepSeek API Docs](https://platform.deepseek.com/api-introduction)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [WeChat Mini Program Docs](https://developers.weixin.qq.com/miniprogram/dev/framework/)

### Tutorials
- [Deploy Node.js to Railway](https://docs.railway.app/)
- [Deploy Node.js to Vercel](https://vercel.com/docs/concepts/deployments/overview)
- [PM2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## ✅ Checklist

Before going to production:

- [ ] Backend deployed and accessible
- [ ] API keys configured in backend environment
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured
- [ ] Health check endpoint working
- [ ] Logs are being collected
- [ ] Monitoring/alerting set up
- [ ] WeChat Mini Program configured with backend URL
- [ ] Test connection successful
- [ ] End-to-end testing complete
- [ ] Error handling tested
- [ ] Backup plan in place
- [ ] Documentation updated

---

## 🎉 You're Ready!

Once you've completed these steps:

1. ✅ Backend is deployed and running
2. ✅ API keys are securely stored on backend
3. ✅ Mini program is configured with backend URL
4. ✅ Test connection is successful

**You can now:**
- Generate articles without exposing API keys
- Switch between AI models easily
- Scale your application safely
- Rotate API keys without updating mini program

---

**Last Updated**: 2026-01-21
**Version**: 1.0.0

For support, check the logs or review this guide's troubleshooting section.
