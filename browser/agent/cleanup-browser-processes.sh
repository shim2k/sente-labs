#!/bin/bash

echo "🔍 Searching for orphaned headless_shell processes..."

# Find all headless_shell processes
PROCESSES=$(ps aux | grep headless_shell | grep -v grep)

if [ -z "$PROCESSES" ]; then
    echo "✅ No headless_shell processes found"
    exit 0
fi

echo "📊 Found headless_shell processes:"
echo "$PROCESSES"
echo ""

# Kill processes using more than 30% CPU or running for more than 2 minutes
echo "💀 Killing high-CPU or long-running processes..."

echo "$PROCESSES" | while IFS= read -r line; do
    PID=$(echo "$line" | awk '{print $2}')
    CPU=$(echo "$line" | awk '{print $3}')
    TIME=$(echo "$line" | awk '{print $10}')
    
    # Convert CPU to integer for comparison
    CPU_INT=$(echo "$CPU" | cut -d'.' -f1)
    
    # Kill if CPU > 30% or if we can't determine (better safe than sorry)
    if [ "$CPU_INT" -gt 30 ] 2>/dev/null || [ -z "$CPU_INT" ]; then
        echo "🔪 Killing process $PID (CPU: $CPU%, Time: $TIME)"
        kill -9 "$PID" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Successfully killed process $PID"
        else
            echo "❌ Failed to kill process $PID (may already be dead)"
        fi
    else
        echo "⏭️  Skipping process $PID (CPU: $CPU% - below threshold)"
    fi
done

echo ""
echo "🧹 Cleanup completed!"
echo "💡 To prevent future issues, set ENABLE_CDP_STREAMING=false in your .env file" 