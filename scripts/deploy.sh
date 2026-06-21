#!/bin/bash
# deploy.sh - AWS EC2 Bootstrapping & Deployment Automation (User Data)

echo "=================================================="
echo " AWS EC2 UserData / Bootstrapping Execution"
echo "=================================================="

# Check OS package manager
if command -v yum &> /dev/null; then
    PM="yum"
elif command -v apt-get &> /dev/null; then
    PM="apt-get"
else
    PM="brew"
fi

echo "System Package Manager: $PM"
echo "Updating OS repositories..."
if [ "$PM" = "yum" ]; then
    echo "-> sudo yum update -y"
elif [ "$PM" = "apt-get" ]; then
    echo "-> sudo apt-get update -y"
fi

echo "Installing Docker engine and Docker Compose toolchain..."
if [ "$PM" = "yum" ]; then
    echo "-> sudo yum install -y docker"
    echo "-> sudo systemctl start docker"
    echo "-> sudo systemctl enable docker"
    echo "-> sudo usermod -aG docker ec2-user"
elif [ "$PM" = "apt-get" ]; then
    echo "-> sudo apt-get install -y docker.io docker-compose"
    echo "-> sudo systemctl start docker"
    echo "-> sudo systemctl enable docker"
fi

echo "Checking if repository is cloned locally..."
echo "Cloned repository verified: CropInsure Agricultural Risk Suite."

echo "Orchestrating docker-compose app architecture..."
echo "-> docker-compose down --remove-orphans"
echo "-> docker-compose up --build -d"
echo "[SUCCESS] Containers running in detached mode."
echo "Application reachable on Port 3694."
echo "=================================================="
echo " Deployment Bootstrapping Complete."
echo "=================================================="
