# Use the official Node.js image from Docker Hub (LTS version is recommended)
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if available
COPY backend/package*.json ./backend/

# Install the Express Backend dependencies
WORKDIR /usr/src/app/backend
RUN npm install

# Move to the root level again and copy everything
WORKDIR /usr/src/app
COPY . .

# Expose the port the Express App binds to
EXPOSE 3000

# Run the server script when the container launches
CMD ["node", "backend/server.js"]
