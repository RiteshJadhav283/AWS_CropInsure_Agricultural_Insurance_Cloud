#!/bin/bash
# user_setup.sh - Secure Linux User and Group Permissions setup for CropInsure

echo "=================================================="
echo " AWS EC2 Linux Post-Deployment IAM/User Provisioning"
echo "=================================================="

# Detect OS
OS_TYPE=$(uname)
echo "System OS detected: $OS_TYPE"

if [ "$OS_TYPE" = "Linux" ]; then
    echo "Creating system groups for CropInsure..."
    # Create groups
    sudo groupadd -f cropinsure-admin
    sudo groupadd -f cropinsure-adjuster

    echo "Creating admin and adjuster system users..."
    # Create users if they don't exist
    id -u cropinsure_admin &>/dev/null || sudo useradd -m -g cropinsure-admin -s /bin/bash cropinsure_admin
    id -u cropinsure_adjuster &>/dev/null || sudo useradd -m -g cropinsure-adjuster -s /bin/bash cropinsure_adjuster

    # Configure secure directory permissions
    echo "Configuring secure shared log and data folders..."
    sudo mkdir -p /var/log/cropinsure
    sudo mkdir -p /opt/cropinsure/backups

    # Adjust ownership and permissions
    sudo chown -R cropinsure_admin:cropinsure-admin /opt/cropinsure
    sudo chown -R cropinsure_admin:cropinsure-admin /var/log/cropinsure
    sudo chmod 770 /opt/cropinsure
    sudo chmod 770 /var/log/cropinsure
    
    echo "[SUCCESS] Groups and users successfully provisioned on Linux target."
else
    # macOS/Other local simulation
    echo "[SIMULATION] Running on non-Linux platform ($OS_TYPE)."
    echo "[SIMULATION] Would execute:"
    echo "  -> sudo groupadd -f cropinsure-admin"
    echo "  -> sudo groupadd -f cropinsure-adjuster"
    echo "  -> sudo useradd -m -g cropinsure-admin cropinsure_admin"
    echo "  -> sudo useradd -m -g cropinsure-adjuster cropinsure_adjuster"
    echo "  -> sudo mkdir -p /var/log/cropinsure"
    echo "  -> sudo chown -R cropinsure_admin:cropinsure-admin /var/log/cropinsure"
    echo "  -> sudo chmod 770 /var/log/cropinsure"
    echo "[SUCCESS] Linux administration group credentials simulated successfully."
fi
