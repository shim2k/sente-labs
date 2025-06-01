#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Browser Automation Services...${NC}"

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Check if required ports are available
echo -e "${YELLOW}Checking port availability...${NC}"

if check_port 3000; then
    echo -e "${RED}Port 3000 is already in use (UI)${NC}"
    exit 1
fi

if check_port 3001; then
    echo -e "${RED}Port 3001 is already in use (API Gateway)${NC}"
    exit 1
fi

echo -e "${GREEN}Ports are available${NC}"

# Create .env files if they don't exist
echo -e "${YELLOW}Setting up environment files...${NC}"

# API Gateway .env
if [ ! -f "api-gateway/.env" ]; then
    echo -e "${YELLOW}Creating api-gateway/.env from example...${NC}"
    cp api-gateway/env.example api-gateway/.env
    echo -e "${YELLOW}Please update api-gateway/.env with your Auth0 credentials${NC}"
fi

# Agent .env
if [ ! -f "agent/.env" ]; then
    echo -e "${YELLOW}Creating agent/.env...${NC}"
    cat > agent/.env << EOF
# Server Configuration
PORT=4000
NODE_ENV=development

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key

# Browser Configuration
HEADLESS=false
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
SCREENSHOT_INTERVAL=1000

# Logging
LOG_LEVEL=info
EOF
    echo -e "${RED}Please update agent/.env with your OpenAI API key${NC}"
fi

# Install dependencies if needed
echo -e "${YELLOW}Checking dependencies...${NC}"

# UI dependencies
if [ ! -d "ui/node_modules" ]; then
    echo -e "${YELLOW}Installing UI dependencies...${NC}"
    cd ui && npm install && cd ..
fi

# API Gateway dependencies
if [ ! -d "api-gateway/node_modules" ]; then
    echo -e "${YELLOW}Installing API Gateway dependencies...${NC}"
    cd api-gateway && npm install && cd ..
fi

# Agent dependencies
if [ ! -d "agent/node_modules" ]; then
    echo -e "${YELLOW}Installing Agent dependencies...${NC}"
    cd agent && npm install && cd ..
fi

# Start services
echo -e "${GREEN}Starting services...${NC}"

# Start API Gateway
echo -e "${YELLOW}Starting API Gateway on port 3001...${NC}"
cd api-gateway && npm run dev > ../api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
cd ..

# Wait for API Gateway to start
sleep 3

# Start UI
echo -e "${YELLOW}Starting UI on port 3000...${NC}"
cd ui && npm start > ../ui.log 2>&1 &
UI_PID=$!
cd ..

# Note: Agent instances are spawned dynamically by the API Gateway

echo -e "${GREEN}Services started!${NC}"
echo -e "${GREEN}UI: http://localhost:3000${NC}"
echo -e "${GREEN}API Gateway: http://localhost:3001${NC}"
echo -e "${GREEN}Agent instances will be spawned on ports 4000-5000${NC}"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo "UI: $UI_PID"
echo "API Gateway: $API_GATEWAY_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "UI: browser/ui.log"
echo "API Gateway: browser/api-gateway.log"
echo "Agent: browser/agent.log (when spawned)"
echo ""
echo -e "${YELLOW}To stop all services, run:${NC}"
echo "kill $UI_PID $API_GATEWAY_PID"

# Function to handle cleanup
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $UI_PID $API_GATEWAY_PID 2>/dev/null
    # Kill any spawned agent processes
    pkill -f "browser/agent"
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Keep script running
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
wait 