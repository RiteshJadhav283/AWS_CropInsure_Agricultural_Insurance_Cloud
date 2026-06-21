FROM node:20-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY server.js ./
COPY public/ ./public/

# Expose port 3694
EXPOSE 3694

# Start server
CMD ["node", "server.js"]
