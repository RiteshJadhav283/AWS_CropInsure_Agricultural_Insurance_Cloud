# AWS Cloud Deployment & Services Guide (CropInsure Platform)

This step-by-step guide explains **what** each AWS service is in simple terms, **why** we used it for the CropInsure platform, and **how** to launch and deploy your web dashboard on a real AWS virtual server.

---

### Part 1: Detailed Explanations of AWS Services & Concepts

Here is a breakdown of every AWS service and concept we used for this project, written using simple analogies and detailed explanations:

### 1. VPC (Virtual Private Cloud) & Subnets
#### 🏠 The Analogy: A Gated Community
Imagine you want to build a house. Instead of building it in the middle of a public street where anyone can walk up to your windows, you buy a plot of land inside a **Gated Community**. 
*   **VPC** is your gated community. It is a private, isolated network inside AWS that belongs *only to you*. No other AWS customers can see inside it unless you open the gates.
*   **Subnets** are like individual rooms in your house:
    *   **Public Subnet (The Living Room)**: Guests are allowed to enter. We put our web application here because farmers need to visit it from their web browsers.
    *   **Private Subnet (The Bedroom/Vault)**: This is locked. No guest can enter from the street. We put our database (MySQL) here because we *never* want hackers from the internet to talk to our database directly.

#### 🎯 Why we used it in CropInsure:
We want to protect Rajesh Patel's policy data and claims records. By setting up a VPC, our web server can talk to our database internally, but the public internet is completely blocked from accessing the database directly.

---

### 2. Security Groups
#### 👮 The Analogy: The Security Guard at the Door
Imagine a security guard standing at the front door of your house. The guard has a checklist:
*   "If you want to come in through the main door (Port 3694) to view the website, you are allowed."
*   "If you want to enter through the back utility door (Port 22 for SSH) to update the code, you must show the secret key (`.pem` file)."
*   "Any other door? Blocked."

A **Security Group** is a virtual firewall that sits around your EC2 virtual computer. It checks every packet of data trying to enter or leave.

#### 🎯 Why we used it in CropInsure:
We configured a Security Group to open port `3694` so farmers can visit the dashboard, and port `22` so that *only you* (the administrator with the private key) can log in via SSH to manage the server. All other doors are locked.

---

### 3. EC2 (Elastic Compute Cloud)
#### 💻 The Analogy: Renting a Laptop in the Sky
Instead of buying a physical server computer, putting it in your office, and plugging it into electricity, you rent a virtual computer from Amazon. 
*   **Elastic** means stretchy. If only 10 farmers are using the portal, you rent a small, cheap computer (`t2.micro`). If a massive hailstorm hits and 100,000 farmers log in at the same time to file claims, you can stretch/scale the server to a high-performance computer (`c5.xlarge`) instantly.

#### 🎯 Why we used it in CropInsure:
It is the host computer. It runs Linux, runs our Docker containers, runs the Express Node.js website code, and keeps the server alive 24/7.

---

### 4. Amazon RDS (Relational Database Service)
#### 🗄️ The Analogy: An Automatic Filing Cabinet with a Secretary
If you install MySQL database directly on your own computer, you have to back it up manually, check if the hard drive is full, and update the software. 
**Amazon RDS** is like hiring a helper to manage the filing cabinet for you. It automatically:
*   Takes daily backups.
*   Replicates/copies the data to another building (Multi-AZ) in case of a fire.
*   Installs safety patches.

#### 🎯 Why we used it in CropInsure:
To ensure **data integrity**. If our web server crashes, Rajesh's insurance records are not lost because they are saved separately in a managed RDS MySQL database in a secure private network.

---

### 5. Amazon S3 (Simple Storage Service)
#### 📦 The Analogy: An Infinite Virtual Warehouse Drawer
S3 is a storage drive in the cloud where you can put any file (images, PDFs, database backups). 
*   It is **infinite**: you never run out of space.
*   It is **highly durable (99.999999999% durability)**: AWS duplicates your file across at least 3 different physical buildings. Even if an entire AWS building is destroyed by a natural disaster, your backup is safe in the other two.

#### 🎯 Why we used it in CropInsure:
When our admin runner executes `backup.sh`, it dumps the MySQL database, zips it, and uploads it to an S3 bucket (`s3://cropinsure-backups-us-east-1`). This ensures we have a secure copy of all records for disaster recovery.

---

### 6. Amazon CloudWatch
#### ⌚ The Analogy: A Health Watch / Heart Monitor
Imagine wearing a smartwatch that constantly checks your heart rate. If your heart rate goes too high, it sends an alert.
**CloudWatch** checks the health of your EC2 servers. It monitors:
*   How hard the CPU is working (CPU % load).
*   How much memory (RAM) is left.
*   How much storage space is left.
*   If any of these go above the threshold (e.g., CPU is at 90%), it rings a **CloudWatch Alarm** and can email the System Manager.

#### 🎯 Why we used it in CropInsure:
We simulated CloudWatch on our System Manager dashboard to show live gauges of CPU/RAM health and display alerts when the server runs out of space or becomes overloaded.

---

### 7. IAM (Identity and Access Management)
#### 🔑 The Analogy: Office Keycards with Access Levels
In a secure company building, the cleaning staff's keycard opens the doors, but not the vault. The CEO's keycard opens the vault, but not the server cabinets.
**IAM** controls *who* (users) and *what* (services) can do what actions:
*   We create an **IAM Role** for our EC2 server that allows it to *upload* backups to S3, but blocks it from *deleting* the S3 bucket.

#### 🎯 Why we used it in CropInsure:
It enforces the **Principle of Least Privilege** (only giving the minimum access required to do a job). This ensures that even if a hacker compromises our web server, they cannot log into our AWS account and delete our backups.

---

### 8. Docker & Containers
#### 🚢 The Analogy: Shipping Containers
In the old days, shipping cargo on boats was messy: pianos, sacks of rice, and cars were thrown together, causing damage. 
Then, they invented the **Shipping Container**. Now, everything is packed into a standard metal box. The cargo ship doesn't care what is inside the box; it just loads it and plugs it in.
*   **Docker** puts our website code, Node.js environment, libraries, and MySQL configurations into a single container box.
*   It runs exactly the same way on your Mac, your Windows computer, or the AWS Linux server.

#### 🎯 Why we used it in CropInsure:
Instead of setting up Node.js and MySQL configurations manually on the AWS EC2 instance, we packed them in Docker containers. This made our deployment as simple as writing `docker-compose up -d` in the cloud.

---

## Part 2: Step-by-Step AWS Cloud Deployment Guide

Follow these steps to deploy the CropInsure platform on a live AWS EC2 instance:

### Step 1: Set Up the Security Group (The Firewall)
1.  Sign in to your [AWS Management Console](https://aws.amazon.com/console/).
2.  Search for `VPC` in the top search bar and click on **VPC** under Services.
3.  Click **Security Groups** on the left sidebar, and click the orange **Create security group** button.
4.  Set names:
    *   *Security group name*: `cropinsure-security-group`
    *   *Description*: `Allows SSH and port 3694 for website`
5.  Add **Inbound Rules**:
    *   👉 **Rule 1**: Type: `SSH` | Port: `22` | Source: `Anywhere-IPv4` (`0.0.0.0/0`).
    *   👉 **Rule 2**: Type: `Custom TCP` | Port: `3694` | Source: `Anywhere-IPv4` (`0.0.0.0/0`).
6.  Click **Create security group** at the bottom.

#### 💡 What did we do & Why?
*   **What we did**: We went to the AWS Network configuration page and created a custom "Security Group" (a security guard) that opens only two specific gates (ports): **Port 22** and **Port 3694**.
*   **Why we did it**: By default, AWS blocks all traffic to any virtual computer to prevent hackers from getting in. If you don't open these ports, your server is like a house with no doors or windows—nobody can enter.
    *   **Port 22 (SSH)** is the developer's back door. It allows you to securely connect to the command line of the server from your Mac terminal to install software and make configuration changes.
    *   **Port 3694** is the front door of the CropInsure web app. We open this port to the entire public internet (`0.0.0.0/0`) so that farmers, adjusters, and managers can type the server's address into their browsers and see the dashboard.
    *   **Any other port** (like database ports or other service ports) is completely locked down, protecting your application from common internet scans and database hacks.

---

### Step 2: Launch the EC2 Instance (The Virtual Server)
1.  Search for `EC2` in the top search bar and click on **EC2** under Services.
2.  Click **Launch instance** (orange button).
3.  Set details:
    *   *Name*: `CropInsure-Cloud-Server`
    *   *AMI (OS)*: Click **Amazon Linux** (select the *Amazon Linux 2023 - Free Tier Eligible*).
    *   *Instance Type*: Select `t2.micro` or `t3.micro`.
    *   *Key pair*: Click **Create new key pair** ➡️ Name it `cropinsure-ssh-key` ➡️ Private key format: `.pem` ➡️ Click **Create key pair** (this downloads `cropinsure-ssh-key.pem` to your Mac).
4.  Under *Network Settings*, click **Edit** (top right of network box):
    *   Under *Firewall*, select **Select existing security group**.
    *   Check the box next to `cropinsure-security-group`.
5.  Click orange **Launch instance** button on the right side.

#### 💡 What did we do & Why?
*   **What we did**: We ordered a brand-new virtual computer (EC2) from Amazon, installed a fresh copy of Linux on it, generated a cryptographic lock key (`.pem` file), and put our custom security guard (from Step 1) in front of it.
*   **Why we did it**: 
    *   **EC2 (Virtual Server)**: We need a computer that is running 24/7, has a public IP address, and has high-speed internet so the crop insurance database is always active. 
    *   **Amazon Linux (OS)**: We selected Linux because it is super stable, lightweight, has no expensive licensing fees, and is the industry-standard operating system for cloud servers.
    *   **t2.micro / t3.micro**: We chose this size because it falls under the "AWS Free Tier". It gives us enough CPU and RAM for our dashboard without costing any money.
    *   **Key Pair (`.pem` file)**: Instead of using a simple, guessable password (like `Admin123`), AWS forces us to use a private cryptographic key file. Your Mac holds the private `.pem` key, and the server holds the public key. The server will *only* let you log in if your Mac can prove it has the matching `.pem` file. This prevents brute-force password guessing bots.
    *   **Attaching the Security Group**: We assigned our gatekeeper rules from Step 1 to this specific virtual computer, so only Port 22 and Port 3694 are accessible.

---

### Step 3: Copy Your Code to the AWS Server
1.  Find your server's public IP from the EC2 Instances list (e.g., `54.210.85.12`).
2.  Open your **Mac Terminal** and navigate to your project folder:
    ```bash
    cd /Users/riteshjadhav/Projects/AWS_CropInsure_Agricultural_Insurance_Cloud
    ```
3.  Change key file permissions (replace `/path/to/` with where your key downloaded, like `~/Downloads/`):
    ```bash
    chmod 400 ~/Downloads/cropinsure-ssh-key.pem
    ```
4.  Copy files to your EC2 instance (replace `<YOUR-EC2-PUBLIC-IP>` with your server's IP address):
    ```bash
    scp -i "~/Downloads/cropinsure-ssh-key.pem" -r ./* ec2-user@<YOUR-EC2-PUBLIC-IP>:~/
    ```
    *Type `yes` if prompted to continue connecting.*

#### 💡 What did we do & Why?
*   **What we did**: We opened the command line terminal on our Mac, set safe file permissions on our private `.pem` key, and copied all of our CropInsure code files (the backend code, frontend files, SQL files, and configurations) over the internet onto our virtual server's hard drive.
*   **Why we did it**:
    *   **`cd /Users/riteshjadhav/Projects/...`**: Tells your Mac terminal to go to the project directory where the server files exist.
    *   **`chmod 400 ...`**: This is a security check. SSH rules state that if a private key file is "too open" (meaning other programs or users on your Mac are allowed to read it), the SSH command will fail because the key is considered insecure. Setting permissions to `400` ensures that *only* your current Mac user can read the key.
    *   **`scp` (Secure Copy Protocol)**: This command sends folders and files securely over the encrypted SSH channel. We need to move the project files from your local Mac disk to the cloud server's local disk (`~/` which represents `/home/ec2-user`) so the server has the actual code to run.

---

### Step 4: Run the App on the AWS Server
1.  Log into your AWS computer via SSH from your Mac terminal:
    ```bash
    ssh -i "~/Downloads/cropinsure-ssh-key.pem" ec2-user@<YOUR-EC2-PUBLIC-IP>
    ```
2.  Install Docker on the server:
    ```bash
    sudo yum update -y
    sudo yum install -y docker
    ```
3.  Start Docker:
    ```bash
    sudo systemctl start docker
    sudo systemctl enable docker
    ```
4.  Enable docker commands for ec2-user (so you don't type sudo):
    ```bash
    sudo usermod -aG docker ec2-user
    ```
5.  **Important**: Log out by typing `exit`, then log back in using the SSH command in step 1.
6.  Download Docker Compose:
    ```bash
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```
7.  Start the CropInsure platform:
    ```bash
    docker-compose up -d --build
    ```

#### 💡 What did we do & Why?
*   **What we did**: We connected our Mac terminal to the server's command terminal using SSH. Once inside, we installed Docker and Docker Compose, enabled them to auto-start on server boot, gave our user permission to run commands, and built and started the application container stack.
*   **Why we did it**:
    *   **`ssh -i ...`**: This logs you into the virtual server. Any command you type after this point runs directly on the AWS virtual server in Amazon's data center.
    *   **Docker installation**: Instead of manually installing Node.js, setting up a MySQL server on Linux, creating SQL tables, and configuring folders, we use **Docker Containers**. This packages our entire application into a standard container that runs identically on any system.
    *   **`sudo usermod -aG docker ec2-user`**: By default, Docker commands require system root administrator privileges (`sudo`). Adding our regular login user (`ec2-user`) to the `docker` group allows us to deploy containers without typing root-level permissions every time. We log out and log back in to apply this permission change.
    *   **`docker-compose up -d --build`**:
        *   `--build`: Compiles the Node.js website image using the instructions in `Dockerfile`.
        *   `-d` (Detached Mode): Starts the containers in the background. If we didn't use `-d`, the website would shut down the absolute second we closed our Mac Terminal. Detached mode keeps the app running forever, even when we log out of the server.
        *   `up`: Spawns two distinct docker containers: our Express backend website running on Port `3694` and our MySQL database running on Port `3306`, linking them together on an isolated network.

---

### Step 5: Access the Website
Open your browser and go to:
👉 **`http://<YOUR-EC2-PUBLIC-IP>:3694`**

You are now running live on the AWS cloud!
*   Demo Farmer: `farmer_rajesh`
*   Demo Adjuster: `adjuster_sunita`
*   Demo Admin: `admin_amit`
*   Demo Billing: `billing_priya`
*   *(All passwords: `pass123`)*
*   ⚠️ **Terminate the instance** on the EC2 console when finished to avoid billing.

#### 💡 What did we do & Why?
*   **What we did**: We entered the public URL of the server into a standard web browser on our computer and logged in with one of our demo Indian user profiles.
*   **Why we did it**: 
    *   To verify that our cloud deployment was successful!
    *   When your browser requests `http://<YOUR-EC2-PUBLIC-IP>:3694`, it sends a packet through the internet. The AWS router directs it to your EC2 instance, the Security Group allows it inside because Port 3694 is open, and Docker hands it to the Node.js container. The Node.js app talks to the database container to fetch the policies and dashboards, rendering the interface instantly.
    *   **Terminating the instance**: We write this warning because AWS charges virtual servers by the hour. When you are done showing the project to your evaluator, terminating the server deletes the instance and stops all billing charges.

---
