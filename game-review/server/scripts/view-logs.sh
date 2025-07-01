#!/bin/bash

# Log viewer script for AOE4 Review Backend

LOGS_DIR="./logs"

show_help() {
    echo "Usage: $0 [OPTIONS] [LOG_FILE]"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo "  -f, --follow    Follow log output (like tail -f)"
    echo "  -n, --lines N   Show last N lines (default: 50)"
    echo "  -l, --list      List available log files"
    echo ""
    echo "Log files:"
    echo "  combined        All logs combined (server + worker)"
    echo "  app             Application logs (info and above)"
    echo "  error           Error logs only"
    echo "  api-errors      API non-200 responses"
    echo "  worker          Worker logs only"
    echo "  worker-error    Worker error logs only"
    echo "  exceptions      Uncaught exceptions"
    echo "  rejections      Unhandled promise rejections"
    echo "  worker-exceptions    Worker uncaught exceptions"
    echo "  worker-rejections    Worker unhandled promise rejections"
    echo ""
    echo "Examples:"
    echo "  $0                   # Show last 50 lines of combined log"
    echo "  $0 -f                # Follow combined log"
    echo "  $0 -n 100 error      # Show last 100 lines of error log"
    echo "  $0 -f app           # Follow application log"
}

list_logs() {
    echo "Available log files:"
    ls -la "$LOGS_DIR"/*.log 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' | column -t
}

# Default values
LINES=50
FOLLOW=false
LOG_FILE="combined"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -l|--list)
            list_logs
            exit 0
            ;;
        -*)
            echo "Unknown option $1"
            show_help
            exit 1
            ;;
        *)
            LOG_FILE="$1"
            shift
            ;;
    esac
done

# Construct log file path
LOG_PATH="$LOGS_DIR/${LOG_FILE}.log"

# Check if log file exists
if [[ ! -f "$LOG_PATH" ]]; then
    echo "Error: Log file '$LOG_PATH' not found"
    echo ""
    list_logs
    exit 1
fi

echo "Viewing: $LOG_PATH"
echo "----------------------------------------"

# Show logs
if [[ "$FOLLOW" == true ]]; then
    tail -f "$LOG_PATH"
else
    tail -n "$LINES" "$LOG_PATH"
fi