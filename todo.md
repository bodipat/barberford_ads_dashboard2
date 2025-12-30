# Barberford Ads Dashboard - Project TODO

## Core Features

- [x] Executive Summary KPI cards (Total Spend, Conversions, CPC, CVR) with progress indicators
- [x] Campaign Performance Breakdown (Erawan, Noir, Reserve comparison)
- [x] Line chart: Daily Spend vs Conversions trend
- [x] Bar chart: Conversions by Campaign
- [x] Pie chart: Budget Distribution
- [x] Keyword & Ad Group deep dive table with sortable columns
- [x] Mock data generation simulating Google Ads API
- [x] Optimization alerts panel with actionable insights
- [x] Date range selector (Daily, Weekly, Campaign-to-Date)
- [x] Campaign status indicators (Budget pacing, CVR health, QS warnings)
- [x] Responsive mobile layout

## Database Schema

- [x] Campaigns table
- [x] Daily metrics table
- [x] Keywords table

## UI/UX

- [x] Dark elegant theme with gold accents (luxury aesthetic)
- [x] Dashboard layout
- [x] Color-coded alerts (green/yellow/red)
- [x] Smooth animations and transitions

## Backend

- [x] tRPC procedures for dashboard data
- [x] Mock data generation
- [x] Aggregation queries for metrics

## Google Ads API Integration

- [x] Set up Google Ads API credentials (Developer Token, OAuth Client ID/Secret)
- [x] Implement OAuth 2.0 authentication flow
- [x] Create Google Ads API service layer
- [x] Fetch real campaign performance data
- [x] Fetch real keyword performance data
- [x] Add fallback to mock data when API unavailable
- [x] Handle API rate limits and errors gracefully
- [x] Add live/demo data source indicator badge

## UI/UX Improvements (User Feedback)

- [x] Hide or filter campaigns with no data (฿0 spend, 0 conversions)
- [x] Fix Quality Score display - show "N/A" instead of 0/10
- [x] Fix Conversions by Campaign chart - truncated campaign names
- [x] Fix Budget Distribution pie chart - overlapping legend text
- [x] Improve overall chart readability


## Google Analytics Integration
- [x] Research Google Analytics API (GA4) requirements
- [x] Request GA credentials from user (Property ID, Service Account)
- [x] Create backend API endpoint for Google Analytics data
- [x] Add Analytics Overview section to dashboard
- [x] Show Organic vs Paid traffic comparison
- [x] Display SEO metrics (sessions, users, bounce rate, page views)
- [x] Create combined performance charts
- [x] Test and validate integration
