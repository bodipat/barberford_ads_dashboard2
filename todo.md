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

## Event Goals from GA4
- [x] Add getEventGoals function to fetch GA4 events/conversions
- [x] Create analytics router endpoint for event goals
- [x] Add Event Goals UI section to AnalyticsSection component
- [x] Display key events (phone calls, form submissions, etc.)
- [x] Test event goals integration

## Event Goals & Conversions (Google Ads) - New Feature
- [x] Add fetchConversionActions function to Google Ads API layer
- [x] Add tRPC endpoint for conversion events by date range
- [x] Build Event Goals & Conversions section in Dashboard with Daily/Weekly/Campaign views
- [x] Add conversion trend line chart
- [x] Add per-campaign conversion breakdown table
- [x] Test with live Google Ads data

## Campaign to Date - Full History Fix
- [ ] Update campaign start date from 30-day rolling to actual start date (Dec 17, 2025)
- [ ] Verify all sections (KPIs, Campaign Performance, Keywords, Conversion Events) use full date range

## Date Range Selector Bug Fix
- [x] Fix Daily/Weekly/Campaign to Date selector not updating data across all sections
- [x] Extend Campaign to Date start date to Dec 17, 2025 (actual campaign start)
- [x] Ensure Event Goals & Conversions section also responds to date range changes

## Account Balance Display
- [x] Add fetchAccountBalance function to googleAds.ts
- [x] Add tRPC endpoint dashboard.getAccountBalance
- [x] Add Account Balance card to Dashboard UI (Executive Summary section)
- [x] Show balance as of today with last-updated timestamp
- [x] Test with live Google Ads data

## Top 10 Best Click Keywords per Campaign
- [x] Add fetchTopKeywordsByCampaign function to googleAds.ts
- [x] Add tRPC endpoint dashboard.getTopKeywordsByCampaign
- [x] Build Top Keywords section UI with campaign tabs
- [x] Show keyword, clicks, impressions, CTR, CPC, conversions per row
- [x] Highlight top performer with gold accent
- [x] Test with live data and save checkpoint

## Dashboard Re-Design (4-Section Layout)
- [x] Section 1: High-Level Performance — Cost, Conversions, CPA, CTR with time comparison vs previous period
- [x] Section 2: Campaign & Ad Group Breakdown — table with Impression Share, highlight high CPA campaigns
- [x] Section 3: Optimization Insights — Search Terms Report, Device Performance, Ad Copy Performance, Location Performance
- [x] Section 4: Quality & Relevance — Quality Score per keyword, Landing Page Experience
- [x] Add time comparison toggle (vs previous 7 days / previous period)
- [x] Add trend line charts (Line Chart) for key metrics
- [x] Add conditional formatting (color highlight) in tables for anomaly detection
- [x] Move Google Analytics data to separate "Analytics" sidebar menu page
- [x] Add new sidebar nav item for Google Analytics page
- [x] Add sidebar navigation using DashboardLayout component
- [x] Test all sections with live data and save checkpoint
