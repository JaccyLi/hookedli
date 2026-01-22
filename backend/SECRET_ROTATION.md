# Secret Rotation Guide

## Overview

This guide explains how to rotate secrets in your HookedLee backend with **zero downtime**.

---

## What Secrets Do You Have?

### 1. JWT Secret (`JWT_SECRET`)
- **Purpose**: Signs and verifies JWT tokens for user authentication
- **Location**: Backend `.env` file
- **Rotation**: Supported with zero downtime (multiple secrets)
- **Frequency**: Every 6-12 months (security best practice) or if compromised

### 2. WeChat AppSecret (`WECHAT_APP_SECRET`)
- **Purpose**: Verifies WeChat user login codes
- **Location**: Backend `.env` file + WeChat MP Platform
- **Rotation**: Only if compromised (requires WeChat Platform reset)
- **Frequency**: Only when necessary

### 3. BigModel API Key (`BIGMODEL_API_KEY`)
- **Purpose**: Access to BigModel AI services (GLM-4.7, image generation)
- **Location**: Backend `.env` file + BigModel Platform
- **Rotation**: Anytime (create new key in BigModel Platform)
- **Frequency**: Every 3-6 months or if quota drained

### 4. DeepSeek API Key (`DEEPSEEK_API_KEY`)
- **Purpose**: Access to DeepSeek AI services
- **Location**: Backend `.env` file + DeepSeek Platform
- **Rotation**: Anytime (create new key in DeepSeek Platform)
- **Frequency**: Every 3-6 months or if quota drained

---

## JWT Secret Rotation (Zero Downtime)

Your backend now supports **multiple JWT secrets**, allowing seamless rotation without logging out users.

### How It Works

```
JWT_SECRET=secret1,secret2,secret3
              ↓
        Sign with: secret1 (first secret)
        Verify with: secret1 OR secret2 OR secret3
```

### Rotation Steps

#### Step 1: Generate New Secret

```bash
# On your server or local machine
openssl rand -base64 32
```

Example output:
```
Xy9k3mP8nQ2vR7wL4sT6jH1gF5dS8aB3cV9nZ2xK7pM=
```

#### Step 2: Update `.env` File

Edit `/data/hookedli/backend/.env`:

```bash
# Before
JWT_SECRET=old-secret-here

# After (add NEW secret FIRST, then old secret)
JWT_SECRET=new-secret-here,old-secret-here
```

**Important**: New secret goes FIRST (used for signing), old secret kept for verifying existing tokens.

#### Step 3: Restart Backend

```bash
systemctl restart hookedlee-backend
```

#### Step 4: Wait for Token Expiration

- Existing tokens signed with `old-secret-here` will still work
- New tokens will be signed with `new-secret-here`
- After 30 days (token expiration), all tokens use the new secret

#### Step 5: Remove Old Secret (After 30+ days)

Edit `.env` again:
```bash
# After 30 days, remove the old secret
JWT_SECRET=new-secret-here
```

Restart:
```bash
systemctl restart hookedlee-backend
```

---

## Example Rotation Timeline

### Day 0: Add New Secret
```bash
JWT_SECRET=new-secret-2026,old-secret-2025
systemctl restart hookedlee-backend
```

### Day 0-30: Grace Period
- Old tokens (signed with `old-secret-2025`) still work
- New tokens (signed with `new-secret-2026`) issued
- Zero user impact

### Day 30+: Remove Old Secret
```bash
JWT_SECRET=new-secret-2026
systemctl restart hookedlee-backend
```

All old tokens have expired by now.

---

## WeChat AppSecret Rotation

### ⚠️ Warning: Only Rotate If Compromised

WeChat AppSecret rotation requires resetting the secret in WeChat MP Platform, which may cause temporary issues.

### Steps:

1. **Log in to WeChat MP Platform**: https://mp.weixin.qq.com/

2. **Navigate to**: 开发 → 开发管理 → 开发设置

3. **Reset AppSecret**:
   - Click "重置" (Reset) next to AppSecret
   - Copy the new secret

4. **Update Backend Immediately**:

   ```bash
   nano /data/hookedli/backend/.env
   ```

   Update:
   ```bash
   WECHAT_APP_SECRET=new-appsecret-here
   ```

5. **Restart Backend**:

   ```bash
   systemctl restart hookedlee-backend
   ```

**Note**: Old tokens will continue to work until they expire (30 days). Only new logins will use the new AppSecret.

---

## BigModel API Key Rotation

### Steps:

1. **Log in to BigModel Platform**: https://open.bigmodel.cn/

2. **Create New API Key**:
   - Navigate to API Keys section
   - Click "Create New Key"
   - Copy the new key

3. **Update Backend**:

   ```bash
   nano /data/hookedli/backend/.env
   ```

   Update:
   ```bash
   BIGMODEL_API_KEY=new-api-key-here
   ```

4. **Restart Backend**:

   ```bash
   systemctl restart hookedlee-backend
   ```

5. **Delete Old Key** (optional):
   - Go back to BigModel Platform
   - Delete the old key after confirming the new one works

**Note**: This takes effect immediately - no graceful transition needed.

---

## DeepSeek API Key Rotation

### Steps:

1. **Log in to DeepSeek Platform**: https://platform.deepseek.com/

2. **Create New API Key**:
   - Navigate to API Keys section
   - Click "Create New Key"
   - Copy the new key

3. **Update Backend**:

   ```bash
   nano /data/hookedli/backend/.env
   ```

   Update:
   ```bash
   DEEPSEEK_API_KEY=new-api-key-here
   ```

4. **Restart Backend**:

   ```bash
   systemctl restart hookedlee-backend
   ```

5. **Delete Old Key** (optional):
   - Go back to DeepSeek Platform
   - Delete the old key after confirming the new one works

**Note**: This takes effect immediately - no graceful transition needed.

---

## Best Practices

### ✅ DO:
- Rotate JWT secret every 6-12 months
- Use strong, randomly generated secrets (32+ characters)
- Keep secrets in `.env` file (never commit to git)
- Restart backend immediately after updating secrets
- Wait for token expiration before removing old JWT secrets
- Test in development before production rotation

### ❌ DON'T:
- Rotate WeChat AppSecret unless necessary
- Use weak or predictable secrets
- Share secrets via email/chat
- Commit `.env` file to version control
- Remove old JWT secret before tokens expire
- Rotate multiple secrets at once

---

## Emergency Rotation (Compromised Secrets)

If a secret is leaked or compromised:

### Immediate Actions:

1. **Generate New Secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Update .env** (replace immediately, don't add):
   ```bash
   JWT_SECRET=new-emergency-secret-here
   ```

3. **Restart Backend**:
   ```bash
   systemctl restart hookedlee-backend
   ```

4. **Monitor Logs**:
   ```bash
   journalctl -u hookedlee-backend -f
   ```

**Consequence**: All users will need to login again (tokens invalidated).

---

## Summary Table

| Secret | Zero Downtime? | Rotation Method | Frequency |
|--------|----------------|-----------------|-----------|
| JWT Secret | ✅ Yes | Add new, remove old after 30 days | 6-12 months |
| WeChat AppSecret | ❌ No | Reset in WeChat Platform | Only if compromised |
| BigModel API Key | ❌ No | Create new in BigModel Platform | 3-6 months |
| DeepSeek API Key | ❌ No | Create new in DeepSeek Platform | 3-6 months |

---

## Verification Commands

After rotating any secret, verify the backend is working:

```bash
# Check backend status
systemctl status hookedlee-backend

# Check logs for errors
journalctl -u hookedlee-backend -n 50

# Test health endpoint
curl https://suosuoli.com/api/health

# Check authentication (requires WeChat code from miniprogram)
curl -X POST https://suosuoli.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code"}'
```

---

## Need Help?

If something goes wrong during rotation:

1. **Revert the change** (restore old `.env` file)
2. **Restart the backend**: `systemctl restart hookedlee-backend`
3. **Check logs**: `journalctl -u hookedlee-backend -n 100`
4. **Verify configuration**: Ensure all secrets are set correctly

---

Remember: **JWT secret rotation** is the only one that supports zero downtime. All other secrets take effect immediately but don't affect user sessions (except WeChat AppSecret, which only affects new logins).
