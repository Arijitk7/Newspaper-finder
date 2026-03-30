FROM node:18-alpine

WORKDIR /app

# Copy backend package files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy all project files
COPY . .

# Expose the port Render uses
EXPOSE 3000

# Start the server
CMD ["node", "backend/server.js"]
