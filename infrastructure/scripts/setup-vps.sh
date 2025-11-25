#!/bin/bash
# This line is called a "shebang" - it tells the system which program to use to run this script
# /bin/bash means "use the Bash shell" to execute this script
# Without this, the system wouldn't know how to run the file

# ============================================================================
# VPS INITIAL SETUP SCRIPT
# ============================================================================
# This script automates the setup of a fresh Ubuntu/Debian VPS server.
# It installs all the tools and configurations needed to run the Strategy app.
#
# What this script does:
# 1. Updates the system packages
# 2. Installs essential tools (curl, git, etc.)
# 3. Installs Docker (for running containers)
# 4. Installs Docker Compose (for managing multiple containers)
# 5. Configures the firewall (security)
# 6. Creates the application directory
#
# Usage:
#   - Manual copy: Copy this file to your VPS, then run: ./setup-vps.sh
#   - From GitHub: curl -fsSL https://raw.githubusercontent.com/your-repo/setup-vps.sh | bash
# ============================================================================

# set -e means "exit immediately if any command fails"
# This is a safety feature - if any step fails, the script stops instead of continuing
# This prevents partial installations that could cause problems later
set -e

# Print a friendly message to show the script has started
# The 🚀 emoji is just visual flair - it doesn't affect functionality
echo "🚀 Setting up VPS for Strategy Application..."

# ============================================================================
# STEP 1: UPDATE SYSTEM PACKAGES
# ============================================================================
# Before installing anything new, we update the package list and upgrade existing packages.
# This ensures we have the latest security patches and bug fixes.
# ============================================================================

echo "📦 Updating system packages..."

# apt-get update: Downloads the latest package lists from Ubuntu's repositories
# This tells your system "here's what packages are available and their versions"
# Think of it like refreshing an app store to see what's available
sudo apt-get update

# apt-get upgrade -y: Upgrades all installed packages to their latest versions
# The -y flag means "yes to all prompts" (non-interactive mode)
# This installs security updates and bug fixes for existing software
sudo apt-get upgrade -y

# ============================================================================
# STEP 2: INSTALL REQUIRED PACKAGES
# ============================================================================
# These are essential tools we'll need for the rest of the setup and deployment.
# ============================================================================

echo "📦 Installing required packages..."

# apt-get install -y: Installs multiple packages at once
# The backslash (\) at the end of each line allows us to continue on the next line
# This makes the script more readable
sudo apt-get install -y \
    curl \              # curl: Tool for downloading files from the internet (we'll use it to get Docker)
    wget \              # wget: Another tool for downloading files (alternative to curl)
    git \               # git: Version control system (needed to clone your repository)
    ufw \               # ufw: "Uncomplicated Firewall" - tool for managing firewall rules
    certbot \           # certbot: Tool for getting free SSL certificates (for HTTPS)
    python3-certbot-nginx \  # Python plugin for certbot to work with Nginx
    htop \              # htop: Better version of "top" - shows running processes (useful for monitoring)
    nano \              # nano: Simple text editor (easier than vim for beginners)
    unzip               # unzip: Tool for extracting zip files (might be needed for some downloads)

# ============================================================================
# STEP 3: INSTALL DOCKER
# ============================================================================
# Docker allows us to run applications in containers (isolated environments).
# This makes deployment easier and more consistent.
# ============================================================================

echo "🐳 Installing Docker..."

# Check if Docker is already installed
# command -v docker: Checks if "docker" command exists in the system
# &> /dev/null: Redirects output to /dev/null (hides it - we don't care about the output, just if it exists)
# The ! means "if NOT found" - so this says "if docker command doesn't exist, then install it"
if ! command -v docker &> /dev/null; then
    # Download the official Docker installation script
    # curl -fsSL: 
    #   -f: Fail silently on server errors
    #   -s: Silent mode (no progress bar)
    #   -S: Show errors even in silent mode
    #   -L: Follow redirects
    # -o get-docker.sh: Save the downloaded script as "get-docker.sh"
    curl -fsSL https://get.docker.com -o get-docker.sh
    
    # Run the Docker installation script
    # sudo sh: Run as administrator (root) using the shell
    # This script automatically detects your OS and installs Docker correctly
    sudo sh get-docker.sh
    
    # Add the current user to the "docker" group
    # usermod -aG: Modify user, -a = append, -G = add to group
    # $USER: Environment variable containing the current username
    # This allows you to run Docker commands without typing "sudo" every time
    sudo usermod -aG docker $USER
    
    # Delete the installation script (cleanup - we don't need it anymore)
    rm get-docker.sh
    
    echo "✅ Docker installed"
else
    # If Docker is already installed, just print a message
    echo "✅ Docker already installed"
fi

# ============================================================================
# STEP 4: INSTALL DOCKER COMPOSE
# ============================================================================
# Docker Compose lets us define and run multiple containers together.
# We use it to run our app, database, Redis, and Nginx all at once.
# ============================================================================

echo "🐳 Installing Docker Compose..."

# Check if Docker Compose is already installed
if ! command -v docker-compose &> /dev/null; then
    # Download Docker Compose binary
    # $(uname -s): Gets the operating system name (e.g., "Linux")
    # $(uname -m): Gets the machine architecture (e.g., "x86_64" or "aarch64")
    # This ensures we download the correct version for your system
    # -o /usr/local/bin/docker-compose: Save it to a directory in the system PATH
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Make the file executable (chmod +x = "change mode, add execute permission")
    # Without this, you couldn't run docker-compose as a command
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# ============================================================================
# STEP 5: CONFIGURE FIREWALL
# ============================================================================
# UFW (Uncomplicated Firewall) protects your server by controlling which ports
# are accessible from the internet. We only allow what's necessary.
# ============================================================================

echo "🔥 Configuring firewall..."

# Set default policy: deny all incoming connections
# This means "by default, block everything coming in"
# Then we'll explicitly allow only what we need
sudo ufw default deny incoming

# Set default policy: allow all outgoing connections
# This means "by default, allow everything going out"
# Your server needs to make outbound connections (download packages, etc.)
sudo ufw default allow outgoing

# Allow SSH connections (port 22)
# This is CRITICAL - if you don't allow SSH, you'll be locked out of your server!
# SSH is how you connect to your VPS remotely
sudo ufw allow ssh
# Note: "ssh" is a shortcut for port 22/tcp
# You could also write: sudo ufw allow 22/tcp

# Allow HTTP connections (port 80)
# This is needed for regular web traffic (before we set up HTTPS)
# Also needed for Let's Encrypt certificate verification
sudo ufw allow 80/tcp

# Allow HTTPS connections (port 443)
# This is needed for secure web traffic (after we set up SSL certificates)
sudo ufw allow 443/tcp

# Enable the firewall
# --force: Don't ask for confirmation (since we're running a script)
# This actually activates the firewall with the rules we just set
sudo ufw --force enable

echo "✅ Firewall configured"

# ============================================================================
# STEP 6: CREATE APPLICATION DIRECTORY
# ============================================================================
# We create a dedicated directory where we'll store the application files.
# /opt is a standard location for third-party software on Linux systems.
# ============================================================================

echo "📁 Creating application directory..."

# Define a variable with the directory path
# Variables in bash: VARIABLE_NAME="value"
# We use this variable so we can reference it multiple times
APP_DIR="/opt/strategy"

# Create the directory (and parent directories if they don't exist)
# mkdir -p: 
#   -p = create parent directories if needed
#   -p = don't error if directory already exists
# sudo: Need admin rights to create directories in /opt
sudo mkdir -p "${APP_DIR}"

# Change ownership of the directory to the current user
# chown: Change owner
# $USER:$USER: Set both owner and group to current user
# This means you (not root) own the directory, so you can write to it without sudo
sudo chown $USER:$USER "${APP_DIR}"

# ============================================================================
# COMPLETION MESSAGE
# ============================================================================
# Print helpful information about what to do next.
# ============================================================================

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repository: cd ${APP_DIR} && git clone <your-repo-url> ."
echo "2. Copy .env.production.example to .env.production and configure it"
echo "3. Run the deployment script: ./infrastructure/scripts/deploy-vps.sh"
echo ""
echo "⚠️  Note: You may need to log out and log back in for Docker group changes to take effect"
# This note is important: When you're added to the "docker" group, the change doesn't
# take effect in your current session. You need to log out and back in (or restart SSH)
# for the group membership to be recognized. Otherwise, you'll still need "sudo" for Docker commands.

