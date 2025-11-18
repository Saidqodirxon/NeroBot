# Admin Panel - Mavsum (Season) Management Updates

## Overview

Admin panel has been completely updated with season management functionality. Users can now manage seasons, filter statistics and user data by season, view individual user's promo code history, and export data.

## ✅ Completed Features

### 1. **Seasons Management Page** (`admin/src/pages/Seasons.jsx`)

- Full CRUD operations for seasons
- Create new seasons with name, description, start/end dates
- Edit existing seasons
- Delete seasons with cascade warning (deletes all related codes and usage records)
- Active/Inactive season toggle
- Visual indicators for active seasons (green highlight)

### 2. **Stats Page Updates** (`admin/src/pages/Stats.jsx`)

- Added season filter dropdown
- Statistics reload automatically when season is selected
- Shows filtered data: total codes, used codes, unused codes, total users
- Top users table shows users from selected season
- Users by region breakdown filtered by season
- "Barcha mavsumlar" (All seasons) option to see aggregate data

### 3. **Users Page - Major Updates** (`admin/src/pages/UsersNew.jsx`)

- **User Details Modal**: Click any user to see their complete promo code history
  - Shows user information (name, phone, region, username, telegram ID, registration date)
  - Displays all promo codes entered by that user
  - Season filter dropdown inside modal to filter user's codes by season
  - Download button to export user's code history to Excel
  - Shows code, season name, and usage date for each entry
- Existing region filter still works
- Excel export of all users still available

### 4. **Promo Codes Page Updates** (`admin/src/pages/Groups.jsx`)

- **Season Selector**: Required when adding new promo codes
- Season dropdown shows all seasons with "(Faol)" indicator for active ones
- Cannot submit codes without selecting a season
- Promo codes table now displays season name column
- All existing functionality preserved (filter by used/unused, delete codes, export)

### 5. **Dashboard Navigation** (`admin/src/pages/Dashboard.jsx`)

- Reordered navigation menu:
  1. 📊 Statistika (Stats) - NOW DEFAULT PAGE
  2. 🎭 Mavsumlar (Seasons)
  3. 📝 Promo Kodlar (Promo Codes)
  4. 👥 Foydalanuvchilar (Users)
  5. 📢 Yangilik Yuborish (Broadcast)
- Default landing page changed from `/app/codes` to `/app/stats`
- Added Seasons route

### 6. **API Service Updates** (`admin/src/services/api.js`)

- **Seasons Module**:
  - `getAll()` - Get all seasons
  - `create(data)` - Create new season
  - `update(id, data)` - Update season
  - `delete(id)` - Delete season (cascades to codes and usage)
- **Users Module**:

  - `getAll(params)` - Get all users with optional filters
  - `getDetails(telegramId, seasonId)` - Get user details with code history
  - `exportHistory(telegramId, seasonId)` - Download user's code history as Excel

- **PromoCodes Module**:

  - `getAll(params)` - Get all promo codes
  - `create(data)` - Create new codes with seasonId
  - `delete(code)` - Delete a code

- **Stats Module**:
  - `get(seasonId)` - Get statistics filtered by season

## Backend API Endpoints (Already Implemented)

All backend endpoints are ready in `src/api/routesNew.js`:

### Seasons

- `GET /api/v1/seasons` - Get all seasons
- `POST /api/v1/seasons` - Create season
- `PUT /api/v1/seasons/:id` - Update season
- `DELETE /api/v1/seasons/:id` - Delete season with cascade

### Stats

- `GET /api/v1/stats?seasonId=xxx` - Get stats filtered by season

### Users

- `GET /api/v1/users?region=xxx` - Get users with optional region filter
- `GET /api/v1/users/:telegramId?seasonId=xxx` - Get user details with code history
- `GET /api/v1/export/user/:telegramId?seasonId=xxx` - Export user history to Excel

### Promo Codes

- `GET /api/v1/promo-codes?used=true/false` - Get codes with filter
- `POST /api/v1/promo-codes` - Create codes (requires seasonId)
- `DELETE /api/v1/promo-codes/:code` - Delete a code

## Database Models

### Season Model (`src/models/Season.js`)

```javascript
{
  name: String (required),
  description: String,
  startDate: Date (required),
  endDate: Date,
  isActive: Boolean (default: true)
}
```

### PromoCode Model - Updated

```javascript
{
  code: String (required, unique),
  seasonId: ObjectId (required, indexed, ref: 'Season'),
  description: String,
  isUsed: Boolean,
  usedBy: ObjectId,
  usedAt: Date,
  usedByName: String,
  usedByPhone: String
}
```

### PromoCodeUsage Model - Updated

```javascript
{
  telegramId: Number (required, indexed),
  seasonId: ObjectId (required, indexed, ref: 'Season'),
  userName: String,
  userPhone: String,
  userRegion: String,
  promoCode: String,
  usedAt: Date
}
```

## User Workflow Examples

### Admin creates a new season:

1. Go to "🎭 Mavsumlar" page
2. Click "➕ Yangi mavsum"
3. Enter name (e.g., "Qish 2024")
4. Add description, start date, end date
5. Check "Faol mavsum" if it should be active
6. Click "Saqlash"

### Admin adds promo codes for a season:

1. Go to "📝 Promo Kodlar" page
2. Select season from dropdown (required)
3. Enter codes (one per line)
4. Add optional description
5. Click "Qo'shish"

### Admin views user's complete code history:

1. Go to "👥 Foydalanuvchilar" page
2. Click "📊 Tafsilotlar" button on any user row
3. Modal opens showing user info and all codes
4. Use season dropdown to filter codes by season
5. Click "📥 Excel yuklab olish" to download

### Admin filters statistics by season:

1. Go to "📊 Statistika" page (opens by default)
2. Select season from dropdown at top
3. All statistics update automatically
4. See codes count, users count, top users, region breakdown

### Admin deletes a season:

1. Go to "🎭 Mavsumlar" page
2. Click "🗑 O'chirish" on a season
3. First confirmation: warns about cascade delete
4. Second confirmation: final warning
5. Season, all its codes, and all usage records are deleted

## Key Design Decisions

1. **Season is Admin-Only**: Season names are NOT shown to bot users
2. **Required seasonId**: All new promo codes MUST have a season
3. **Cascade Delete**: Deleting a season removes all related data
4. **Default Landing**: Stats page opens first for quick overview
5. **Modal for Details**: User details open in modal instead of new page
6. **Filter Persistence**: Season filters maintained during user interaction

## Migration Status

✅ Migration script (`src/utils/setupSeasons.js`) successfully run:

- Created default season "Mavsum 1"
- Migrated 4 promo codes to default season
- Migrated 2 promo code usage records to default season

## Testing Checklist

- [x] Create new season
- [x] Edit season
- [x] Delete season (verify cascade)
- [x] Add promo codes with season selector
- [x] View promo codes table with season column
- [x] Filter stats by season
- [x] Click user to view details modal
- [x] Filter user codes by season in modal
- [x] Download user history Excel
- [x] Default landing page is Stats
- [x] All existing functionality preserved

## Running the Application

### Backend (Already Running)

```bash
cd /e/projects/supersite/NeroBot
node src/nerobot.js
```

Backend runs on: http://localhost:3000

### Admin Panel

```bash
cd /e/projects/supersite/NeroBot/admin
npm run dev
```

Admin panel runs on: http://localhost:5174

## Files Modified/Created

### Created:

- `admin/src/pages/Seasons.jsx` - Season management page
- `admin/src/pages/UsersNew.jsx` - Updated users page with modal

### Modified:

- `admin/src/services/api.js` - Added all new API modules
- `admin/src/pages/Dashboard.jsx` - Updated routes and navigation
- `admin/src/pages/Stats.jsx` - Added season filter
- `admin/src/pages/Groups.jsx` - Added season selector, updated API calls

## Notes

- All backend API endpoints are fully tested and working
- Frontend has no compilation errors
- Season filtering works across all pages
- User details modal provides comprehensive code history
- Excel exports include season information
- Cascade delete provides double confirmation to prevent accidents
