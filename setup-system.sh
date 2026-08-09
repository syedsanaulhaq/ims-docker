#!/bin/bash

# IMS System Setup Script for Linux/macOS
echo "========================================"
echo "    IMS System Automatic Setup"
echo "========================================"
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Please install Git first"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js v18 or higher first"
    exit 1
fi

echo "✓ Prerequisites check passed"
echo ""

# Create project directory
echo "Creating project directory..."
mkdir -p ~/Projects
cd ~/Projects

# Clone repository
echo "Cloning IMS repository..."
if [ -d "ims-v1" ]; then
    echo "Directory ims-v1 already exists. Updating..."
    cd ims-v1
    git pull origin main
else
    git clone https://github.com/syedsanaulhaq/ims-v1.git
    cd ims-v1
fi

echo ""
echo "✓ Repository cloned successfully"

# Install dependencies
echo "Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "✓ Dependencies installed successfully"

# Copy environment file
echo "Setting up environment configuration..."
if [ ! -f ".env.sqlserver" ]; then
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env.sqlserver"
    else
        echo "Creating default .env.sqlserver file..."
        cat > .env.sqlserver << EOL
DB_SERVER=localhost
DB_DATABASE=IMS_Database
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_PORT=1433
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
EOL
    fi
    echo "✓ Environment file created"
    echo ""
    echo "IMPORTANT: Please edit .env.sqlserver with your database credentials"
else
    echo "✓ Environment file already exists"
fi

echo ""
echo "========================================"
echo "    Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env.sqlserver with your database credentials"
echo "2. Set up your SQL Server database using the provided SQL scripts"
echo "3. Run: node backend-server.cjs (to start backend)"
echo "4. Run: npm run dev (to start frontend)"
echo ""
echo "Project location: $(pwd)"
echo ""
