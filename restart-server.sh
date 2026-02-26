#!/bin/bash
echo "Stopping any running node processes..."
pkill -f "node.*server.js" || true
pkill -f "nodemon.*server.js" || true
sleep 1
echo "Starting backend server..."
npm run dev

