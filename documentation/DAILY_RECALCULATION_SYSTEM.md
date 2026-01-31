# Daily Recalculation System for Bucket Performance Reports

## Overview

This system ensures that bucket performance reports are recalculated daily and stored in the database, providing consistent data for all users without requiring client-side calculations.

## Architecture

### 1. **Database Layer**
- **Model**: `BucketLiveReturns` (server/models/BucketLiveReturns.js)
  - Stores calculated live returns for each bucket
  - Includes `calculationDate` to track when data was calculated
  - Indexed for fast queries

### 2. **Service Layer**
- **Service**: `bucketLiveReturns.service.js`
  - `getBucketLiveReturns()`: Gets cached data or calculates if needed
  - `recalculateBucketLiveReturns()`: Recalculates for a specific bucket
  - `recalculateAllBuckets()`: Recalculates all active buckets

### 3. **API Layer**
- **Routes**: `bucketLiveReturns.routes.js`
  - `GET /api/bucket-live-returns/:bucketId`: Get live returns
  - `POST /api/bucket-live-returns/:bucketId/recalculate`: Manual recalculation (admin)
  - `POST /api/bucket-live-returns/recalculate-all`: Recalculate all (cron/admin)

### 4. **Scheduled Job**
- **Job**: `dailyRecalculation.job.js`
  - Can run via node-cron (persistent servers) or external cron service
  - Runs daily at 2:00 AM (configurable)

### 5. **Client Layer**
- **Service**: `bucketLiveReturnsService.ts`
  - Fetches data from API
  - Falls back to local calculation if API data unavailable
  - Checks if data is stale

## Setup Instructions

### Option 1: External Cron Service (Recommended for Render/Serverless)

1. **Set up cron secret in environment variables:**
   ```bash
   CRON_SECRET=your-secret-key-here
   ```

2. **Use external cron service** (e.g., EasyCron, cron-job.org):
   - URL: `https://your-domain.com/api/bucket-live-returns/recalculate-all`
   - Method: POST
   - Headers: `x-cron-secret: your-secret-key-here`
   - Schedule: Daily at 2:00 AM (or preferred time)

### Option 2: Node-Cron (For Persistent Servers)

1. **Install node-cron:**
   ```bash
   npm install node-cron
   ```

2. **Set environment variable:**
   ```bash
   USE_NODE_CRON=true
   ```

3. **Job will automatically start** when server starts

## How It Works

### Daily Flow

1. **Cron Job Triggers** (2:00 AM daily)
   - Calls `/api/bucket-live-returns/recalculate-all`
   - Service recalculates all active buckets
   - Results stored in database with today's date

2. **User Requests Data**
   - Client calls `GET /api/bucket-live-returns/:bucketId`
   - Server checks for today's data
   - If found, returns immediately
   - If not found, calculates on-demand (fallback)

3. **Data Consistency**
   - All users see the same calculated data
   - Data is recalculated once per day
   - Stale data is automatically detected

### Client-Side Flow

1. **Check API First**
   - Try to fetch from server
   - If fresh data exists, use it

2. **Check Local Cache**
   - If API unavailable, check localStorage
   - Use cached data if available

3. **Calculate as Last Resort**
   - Only if both API and cache fail
   - Calculation happens client-side
   - Results cached locally

## Benefits

1. **Performance**: Pre-calculated data loads instantly
2. **Consistency**: All users see the same data
3. **Efficiency**: Calculations run once per day, not per user
4. **Reliability**: Fallback mechanisms ensure data is always available
5. **Scalability**: Server handles heavy calculations, clients just fetch

## Manual Recalculation

### Via API (Admin)
```bash
POST /api/bucket-live-returns/:bucketId/recalculate
Authorization: Bearer <token>
```

### Via Admin Panel (Future Enhancement)
- Add "Recalculate Now" button in admin panel
- Triggers API call to recalculate specific bucket

## Monitoring

### Check Recalculation Status
```bash
GET /api/bucket-live-returns/:bucketId
```

Response includes:
- `calculatedAt`: When data was calculated
- `calculationDate`: Date the calculation is based on
- `fundLiveReturns`: All fund-level metrics
- `bucketLiveReturns`: Bucket-level metrics

### Logs
Server logs include:
- `[Daily Recalculation]` prefix for job logs
- Success/failure counts
- Error details for failed buckets

## Troubleshooting

### Data Not Updating
1. Check cron job is running (check logs)
2. Verify `CRON_SECRET` matches in cron service
3. Check database connection
4. Review server logs for errors

### Performance Issues
1. Recalculations run during off-peak hours (2 AM)
2. If needed, adjust schedule in cron service
3. Monitor server resources during recalculation

### Client Falls Back to Calculation
1. Check API endpoint is accessible
2. Verify database has data
3. Check network connectivity
4. Review browser console for errors

## Future Enhancements

1. **Admin Panel Integration**
   - Manual recalculation button
   - View recalculation history
   - Schedule customization

2. **Notifications**
   - Email admin on recalculation completion
   - Alert on failures

3. **Analytics**
   - Track recalculation times
   - Monitor API usage
   - Performance metrics

4. **Optimization**
   - Parallel processing for multiple buckets
   - Incremental updates (only changed funds)
   - Smart caching strategies



