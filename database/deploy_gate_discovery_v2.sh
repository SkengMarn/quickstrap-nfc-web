#!/bin/bash

# ========================================================================
# 🚀 PRODUCTION DEPLOYMENT SCRIPT - Gate Discovery System v2.0
# ========================================================================
# This script safely deploys the gate discovery system to your database
# Run: bash database/deploy_gate_discovery_v2.sh
# ========================================================================

set -e  # Exit on error

echo ""
echo "========================================="
echo "🚀 Gate Discovery System v2.0 Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/../.env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please ensure .env file exists in the project root"
    exit 1
fi

# Load environment variables
source "$SCRIPT_DIR/../.env"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in .env${NC}"
    echo -e "${BLUE}ℹ️  Attempting to construct from VITE_SUPABASE_URL...${NC}"

    if [ -z "$VITE_SUPABASE_URL" ]; then
        echo -e "${RED}❌ Error: Neither DATABASE_URL nor VITE_SUPABASE_URL found${NC}"
        echo ""
        echo "Please add your Supabase database connection string to .env:"
        echo "DATABASE_URL='postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres'"
        echo ""
        echo "You can find this in your Supabase dashboard under:"
        echo "Settings > Database > Connection String (URI)"
        exit 1
    fi
fi

echo -e "${BLUE}📋 Migration files to deploy:${NC}"
echo "  1. 01_gate_discovery_tables.sql"
echo "  2. 02_gate_discovery_functions.sql"
echo "  3. 03_enhanced_gate_discovery_v2.sql"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Starting deployment...${NC}"
echo ""

# Function to execute SQL file
execute_sql() {
    local file=$1
    local name=$2

    echo -e "${BLUE}📦 Deploying: ${name}${NC}"

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Error: File not found: $file${NC}"
        return 1
    fi

    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Success: ${name}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed: ${name}${NC}"
        echo ""
        echo "Attempting with detailed error output..."
        psql "$DATABASE_URL" -f "$file"
        return 1
    fi
}

# Deploy migrations in order
deploy_success=true

# Migration 1: Tables
if ! execute_sql "$MIGRATIONS_DIR/01_gate_discovery_tables.sql" "Gate Discovery Tables"; then
    deploy_success=false
fi

echo ""

# Migration 2: Base Functions
if $deploy_success; then
    if ! execute_sql "$MIGRATIONS_DIR/02_gate_discovery_functions.sql" "Gate Discovery Functions"; then
        deploy_success=false
    fi
fi

echo ""

# Migration 3: Enhanced V2 System
if $deploy_success; then
    if ! execute_sql "$MIGRATIONS_DIR/03_enhanced_gate_discovery_v2.sql" "Enhanced Gate Discovery v2.0"; then
        deploy_success=false
    fi
fi

echo ""
echo "========================================="

if $deploy_success; then
    echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
    echo "========================================="
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo ""
    echo "1. Test the system with your event:"
    echo "   Run this SQL in your Supabase SQL Editor:"
    echo ""
    echo "   SELECT * FROM test_gate_discovery_v2('your-event-id');"
    echo ""
    echo "2. Execute the full pipeline:"
    echo "   SELECT * FROM execute_complete_gate_pipeline_v2('your-event-id');"
    echo ""
    echo "3. View your gates:"
    echo "   SELECT * FROM v_gate_overview_v2 WHERE event_id = 'your-event-id';"
    echo ""
    echo -e "${GREEN}🎉 Your system is production-ready for tomorrow's launch!${NC}"
    echo ""
else
    echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
    echo "========================================="
    echo ""
    echo -e "${YELLOW}⚠️  Please fix the errors above and try again.${NC}"
    echo ""
    exit 1
fi
