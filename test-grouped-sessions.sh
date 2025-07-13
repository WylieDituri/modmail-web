#!/bin/bash

# Test script to create sample data for testing the grouped sessions feature
# This script makes HTTP requests to create users and sessions

BASE_URL="http://localhost:3000"

echo "Creating test data for grouped sessions..."

# Create a Discord user with multiple sessions
echo "Creating Discord user..."
curl -X POST "${BASE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "discordId": "123456789012345678",
    "username": "TestUser#1234",
    "isModerator": false
  }'

# Create another Discord user
echo "Creating second Discord user..."
curl -X POST "${BASE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "discordId": "987654321098765432",
    "username": "AnotherUser#5678",
    "isModerator": false
  }'

# Create guest users (these should not be grouped)
echo "Creating guest users..."
curl -X POST "${BASE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "discordId": "current-user-1234567890",
    "username": "Guest User",
    "isModerator": false
  }'

curl -X POST "${BASE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "discordId": "current-user-0987654321",
    "username": "Guest User",
    "isModerator": false
  }'

echo "Test data created! Check the moderator dashboard to see the grouped sessions."
echo "Visit: ${BASE_URL}/moderator"
