# Automated VPS Deployment with GitHub Actions

## Overview

This guide explains how to set up automated deployments to your VPS using GitHub Actions. Every time you push code to the `main` branch, it will automatically deploy to your production server.

## How It Works

1. You push code to GitHub (main branch)
2. GitHub Actions workflow triggers
3. Workflow connects to your VPS via SSH
4. Pulls latest code
5. Runs deployment script
6. Verifies services are running

## Prerequisites

- GitHub repository with your code
- VPS server already set up (see [VPS Deployment Guide](./vps-deployment.md))
- SSH access to your VPS
- SSH key pair for authentication

---

## Step 1: Generate SSH Key (if you don't have one)

If you already have an SSH key you use for your VPS, skip this step.

### On your local machine:

```bash
# Generate a new SSH key (or use existing one)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates two files:
# ~/.ssh/github_actions_deploy (private key - keep secret!)
# ~/.ssh/github_actions_deploy.pub (public key - add to VPS)

# View your public key content:
cat ~/.ssh/github_actions_deploy.pub

# This will output something like:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy
#
# Copy this entire line - this is YOUR_PUBLIC_KEY_CONTENT
```

---

## Step 2: Add SSH Key to VPS

### Option A: Add as authorized key for root user

```bash
# On your VPS
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Get your public key content from your local machine:
# On your LOCAL machine, run:
cat ~/.ssh/github_actions_deploy.pub

# This will output something like:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy
#
# Copy the ENTIRE output (all on one line)

# Then on VPS, paste the public key:
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Quick method using ssh-copy-id (if you have password access):**

```bash
# On your LOCAL machine
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@YOUR_VPS_IP

# This automatically copies the key to the VPS
```

### Option B: Create a dedicated deployment user (Recommended for security)

```bash
# On your VPS
# Create a new user for deployments
sudo adduser deployer
sudo usermod -aG docker deployer  # Add to docker group

# Switch to deployer user
su - deployer

# Add SSH key
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Get your public key content from your local machine:
# On your LOCAL machine, run:
# cat ~/.ssh/github_actions_deploy.pub
# Copy the entire output

# Then on VPS, paste the public key:
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Give deployer access to the application directory
sudo chown -R deployer:deployer /opt/strategy
```

**Note**: If using a deployment user, make sure they have:
- Access to `/opt/strategy` directory
- Docker permissions (in `docker` group)
- Ability to run `docker-compose` commands

---

## Step 3: Test SSH Connection

Test that you can connect to your VPS:

```bash
# From your local machine
# Use -o IdentitiesOnly=yes to prevent "Too many authentication failures" error
ssh -i ~/.ssh/github_actions_deploy -o IdentitiesOnly=yes root@YOUR_VPS_IP

# Or if using deployer user
ssh -i ~/.ssh/github_actions_deploy -o IdentitiesOnly=yes deployer@YOUR_VPS_IP
```

**Important**: The `-o IdentitiesOnly=yes` flag tells SSH to only use the key you specify, preventing the "Too many authentication failures" error that occurs when SSH tries multiple keys.

If connection works, you're ready for the next step!

---

## Step 4: Add GitHub Secrets

GitHub Actions needs your VPS credentials. These are stored securely as "Secrets".

### Steps:

1. **Go to your GitHub repository**
2. **Click on "Settings"** (top menu)
3. **Click on "Secrets and variables" → "Actions"** (left sidebar)
4. **Click "New repository secret"**
5. **Add these secrets one by one:**

#### Required Secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address | `206.189.91.220` |
| `VPS_USER` | SSH username | `root` or `deployer` |
| `VPS_SSH_KEY` | Your **private** SSH key content | (see below) |
| `VPS_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |

### Getting your private SSH key:

```bash
# On your local machine
cat ~/.ssh/github_actions_deploy

# Copy the ENTIRE output (including -----BEGIN and -----END lines)
# Paste it into the VPS_SSH_KEY secret
```

**Important**: 
- Copy the **private** key (not the `.pub` file)
- Include the `-----BEGIN` and `-----END` lines
- Keep this key secret! Never commit it to git.

---

## Step 5: Verify Workflow File

The workflow file is already created at `.github/workflows/deploy-vps.yml`.

**What it does:**
- Triggers on push to `main` branch
- Connects to VPS via SSH
- Pulls latest code
- Runs deployment script
- Verifies services are running

**You can customize:**
- Change the branch name (currently `main`)
- Add more verification steps
- Add notifications (Slack, email, etc.)

---

## Step 6: Test the Deployment

### First deployment:

1. **Commit and push the workflow file** (if not already committed):

```bash
git add .github/workflows/deploy-vps.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

2. **Watch the deployment**:
   - Go to your GitHub repo
   - Click on "Actions" tab
   - You should see "Deploy to VPS" workflow running
   - Click on it to see logs in real-time

3. **Verify on VPS**:
   ```bash
   # SSH into your VPS (use IdentitiesOnly if you have multiple SSH keys)
   ssh -i ~/.ssh/github_actions_deploy -o IdentitiesOnly=yes deployer@YOUR_VPS_IP
   # Or if using root:
   # ssh -i ~/.ssh/github_actions_deploy -o IdentitiesOnly=yes root@YOUR_VPS_IP
   
   # Check if deployment ran
   cd /opt/strategy
   git log -1  # Should show latest commit
   
   # Check services
   docker-compose -f docker-compose.prod.yml ps
   ```

---

## Manual Deployment Trigger

You can also trigger deployment manually:

1. Go to GitHub repo → "Actions" tab
2. Click on "Deploy to VPS" workflow
3. Click "Run workflow" button
4. Select branch and click "Run workflow"

---

## Troubleshooting

### Error: "Permission denied (publickey)" or "Too many authentication failures"

**Problem**: SSH key not set up correctly or SSH trying too many keys

**Solution**:
1. **Use `IdentitiesOnly` flag** when testing:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy -o IdentitiesOnly=yes deployer@YOUR_VPS_IP
   ```

2. **Verify public key is in `~/.ssh/authorized_keys` on VPS**:
   ```bash
   # On VPS
   cat ~/.ssh/authorized_keys
   # Should see your public key
   ```

3. **Check file permissions on VPS**:
   ```bash
   # On VPS
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

4. **Verify private key in GitHub Secrets is correct** (include BEGIN/END lines)

5. **Alternative: Configure SSH config** (recommended for repeated use):
   ```bash
   # On your local machine
   nano ~/.ssh/config
   ```
   Add:
   ```
   Host YOUR_VPS_IP
       HostName YOUR_VPS_IP
       User deployer
       IdentityFile ~/.ssh/github_actions_deploy
       IdentitiesOnly yes
   ```
   Then connect with: `ssh YOUR_VPS_IP`

### Error: "git: command not found"

**Problem**: Git not installed on VPS

**Solution**:
```bash
# On VPS
sudo apt-get update
sudo apt-get install -y git
```

### Error: "docker-compose: command not found"

**Problem**: Docker Compose not in PATH or user doesn't have permissions

**Solution**:
```bash
# On VPS
# Check if docker-compose exists
which docker-compose

# If not found, check if it's docker compose (newer version)
docker compose version

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Error: "Permission denied" when running deploy script

**Problem**: Script not executable or user doesn't have permissions

**Solution**:
```bash
# On VPS
cd /opt/strategy
chmod +x infrastructure/scripts/deploy-vps.sh
sudo chown -R $USER:$USER /opt/strategy
```

### Deployment runs but services don't start

**Check logs**:
```bash
# On VPS
cd /opt/strategy
docker-compose -f docker-compose.prod.yml logs
docker-compose -f docker-compose.prod.yml ps
```

Common issues:
- Environment variables not set (check `.env.production`)
- Port conflicts
- Insufficient resources

---

## Security Best Practices

1. **Use a dedicated deployment user** (not root)
   - Create a user with minimal permissions
   - Only give access to what's needed

2. **Restrict SSH access**
   - Disable password authentication
   - Use SSH keys only
   - Consider changing default SSH port

3. **Rotate SSH keys regularly**
   - Generate new keys periodically
   - Update GitHub Secrets
   - Remove old keys from VPS

4. **Monitor deployments**
   - Check GitHub Actions logs regularly
   - Set up alerts for failed deployments
   - Review what's being deployed

5. **Use branch protection**
   - Require pull request reviews
   - Prevent direct pushes to main
   - Use staging environment for testing

---

## Advanced Configuration

### Deploy only on specific paths

Edit `.github/workflows/deploy-vps.yml`:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'apps/**'  # Only deploy if app code changes
      - 'infrastructure/**'  # Or infrastructure changes
```

### Add deployment notifications

Add to workflow:

```yaml
- name: Notify on success
  if: success()
  run: |
    # Send notification (Slack, Discord, email, etc.)
    curl -X POST YOUR_WEBHOOK_URL -d '{"text":"Deployment successful!"}'
```

### Deploy to staging first

Create separate workflow for staging:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches:
      - develop  # Deploy to staging on develop branch
```

### Rollback on failure

Add rollback step:

```yaml
- name: Rollback on failure
  if: failure()
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      cd /opt/strategy
      git reset --hard HEAD~1  # Go back one commit
      ./infrastructure/scripts/deploy-vps.sh
```

---

## Workflow File Location

The workflow file is located at:
```
.github/workflows/deploy-vps.yml
```

## Related Documentation

- [VPS Deployment Guide](./vps-deployment.md) - Initial VPS setup
- [Domain Setup Guide](./vps-domain-setup.md) - Setting up domain and SSL

---

## Summary

✅ **What we set up:**
- GitHub Actions workflow for automated deployment
- SSH key authentication
- Automatic deployment on push to main branch
- Deployment verification

✅ **Benefits:**
- No manual deployment needed
- Consistent deployment process
- Deployment history in GitHub
- Easy rollback if needed

✅ **Next steps:**
1. Set up GitHub Secrets
2. Push code to trigger first deployment
3. Monitor deployments in GitHub Actions tab
4. Enjoy automated deployments! 🚀

---

## Quick Reference

**Workflow triggers:**
- Push to `main` branch
- Manual trigger from GitHub UI

**What happens:**
1. Connects to VPS via SSH
2. Pulls latest code
3. Runs `./infrastructure/scripts/deploy-vps.sh`
4. Verifies services are running

**Check deployment status:**
- GitHub repo → Actions tab
- View logs in real-time
- See deployment history

**Troubleshoot:**
- Check GitHub Actions logs
- SSH into VPS and check manually
- Review deployment script logs

