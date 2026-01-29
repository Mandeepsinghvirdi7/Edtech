# MERN Dashboard - New Header-Based Architecture

## Overview

This document describes the major architectural change implemented to ensure ALL CSV/Excel headers are persisted in the database as explicit fields. This guarantees that:

1. **Charts, KPIs, and reports** have direct access to all required data
2. **Headers are validated** at upload time - invalid uploads are rejected immediately
3. **Data integrity** is maintained - all rows contain all required fields
4. **Backward compatibility** is preserved - existing data continues to work

---

## Critical Rule

> **When a file is uploaded (CSV/Excel), ALL headers must be persisted in the database exactly as data columns.**

This means:
- Every required header MUST be present in the uploaded file
- Missing even one header causes rejection with a clear error message
- All persisted fields default to `0` for numeric fields if data is missing
- The database schema reflects the actual business metrics

---

## Required Headers & Database Fields

The following 13 headers are **mandatory** and must exist in every upload:

| **Display Name**      | **DB Field**   | **Type**  | **Default** | **Description**                          |
|----------------------|---------------|-----------|------------|------------------------------------------|
| FY                   | `fy`          | String    | "2025"     | Fiscal Year                              |
| Month                | `month`       | String    | -          | Month name (APRIL-MARCH cycle)           |
| DBM                  | `dbm`         | String    | -          | Deputy Branch Manager                    |
| Team Leader          | `teamLeader`  | String    | -          | Team Leader name                         |
| BDE                  | `bdeName`     | String    | -          | Business Development Executive           |
| Target               | `target`      | Number    | 0          | Sales target                             |
| Admissions           | `admissions`  | Number    | 0          | Total admissions                         |
| Points               | `points`      | Number    | 0          | Points earned                            |
| Closed Admissions    | `closedAdm`   | Number    | 0          | Closed/finalized admissions              |
| Cancellation/Backout | `cancellation`| Number    | 0          | Cancellations or backouts                |
| Incomplete Form      | `incomplete`  | Number    | 0          | Incomplete form submissions              |
| Closed Point         | `closedPoints`| Number    | 0          | Points on closed admissions              |
| Target %             | `targetPct`   | Number    | 0          | Target achievement percentage           |

---

## Backend Architecture Changes

### 1. Centralized Header Configuration

**File:** `backend/server.js` (lines 177-370)

Two configuration objects drive the entire validation pipeline:

#### `ALLOWED_HEADERS` (lines 180-242)
Defines all valid headers with metadata:
```javascript
const ALLOWED_HEADERS = {
    'FY': { 
        required: true, 
        dbField: 'fy', 
        type: 'string',
        description: 'Fiscal Year (e.g., 2025)'
    },
    // ... all 13 headers defined
};
```

#### `HEADER_NORMALIZATION_PATTERNS` (lines 244-370)
Maps various input formats to standard headers:
```javascript
const HEADER_NORMALIZATION_PATTERNS = {
    'fy': 'FY',
    'financialyear': 'FY',
    'year': 'FY',
    'teamleader': 'Team Leader',
    'team_leader': 'Team Leader',
    'teamlead': 'Team Leader',
    // ... handles case variations, spacing, special characters
};
```

**Design Decision:** Centralized config allows:
- Easy addition of new headers in the future
- Consistent handling across validation → transformation → persistence
- Single source of truth for header requirements

### 2. Strict Header Validation

**Function:** `validateAndNormalizeHeaders()` (lines 373-482)

**Three-step validation process:**

1. **Normalize each header** from the file:
   - Trim whitespace
   - Handle special characters (/, %, -)
   - Case-insensitive matching against patterns
   
2. **Check for duplicates:**
   - Reject if same standard header appears twice
   - Example: "Team Leader" and "team_leader" → error

3. **Validate all required headers exist:**
   - List all missing headers
   - Reject upload immediately
   - Return detailed error message

**Return value:**
```typescript
{
    isValid: boolean,
    headerMapping: { 'FY': 'FY Column Name', ... },  // Maps standard -> actual column names
    errors: string[]
}
```

### 3. Enhanced Data Transformation

**Function:** `transformToSalesRecordsWithValidation()` (lines 485-627)

**Key guarantees:**

- **All 13 fields extracted** using validated header mapping
- **Numeric fields coerced** with defaults of 0
- **Row-level error handling** - invalid rows logged but don't stop entire upload
- **Achievement % calculated** from persisted closedPoints/target
- **Metadata added**: `uploadedAt` timestamp

**Rejection criteria:**
- Missing BDE name
- Invalid month
- Any processing error

**Output:**
```typescript
{
    records: SalesRecord[],        // Valid records ready for DB
    rejectedRows: Array,            // Detailed rejection reasons
    summary: {
        totalRows,
        successCount,
        rejectedCount,
        successRate: "95.23%"
    }
}
```

### 4. Improved Upload Endpoint

**Route:** `POST /api/upload-excel` (lines 629-747)

**Seven-step process:**

1. Validate file presence
2. Validate branch provided
3. Parse file to rows
4. STRICT HEADER VALIDATION
5. Transform with validated headers
6. Upload to MongoDB
7. Return detailed report

**Response on success:**
```json
{
    "success": true,
    "message": "Successfully uploaded 150 records",
    "summary": {
        "totalRowsInFile": 152,
        "successfulRows": 150,
        "rejectedRows": 2,
        "successRate": "98.68%"
    },
    "rejectedRows": [
        { "rowNumber": 45, "reason": "Missing BDE name" },
        { "rowNumber": 89, "reason": "Invalid month: 'Jasper'" }
    ],
    "requiredHeaders": ["FY", "Month", ...],
    "headerMapping": { "FY": "FY", "Team Leader": "TEAM LEAD", ... }
}
```

**Response on header validation failure:**
```json
{
    "success": false,
    "error": "File has invalid headers",
    "details": "The uploaded file does not have all required columns.",
    "missingHeaders": ["Closed Point", "Target %"],
    "allErrors": [
        "Missing required headers: Closed Point, Target %"
    ],
    "requiredHeaders": ["FY", "Month", ...]
}
```

---

## Frontend Changes

### 1. Updated SalesRecord Interface

**File:** `src/types/index.ts`

Now includes ALL 13 persisted fields:
```typescript
export interface SalesRecord {
    // Organization
    fy: string;
    month: string;
    branch: string;
    drive: string;
    
    // People
    dbm: string;
    teamLeader: string;
    teamName: string;
    bdeName: string;
    
    // Persisted Metrics (all default to 0)
    target: number;
    admissions: number;
    points: number;
    closedAdm: number;
    cancellation: number;
    incomplete: number;
    closedPoints: number;
    targetPct: number;
    
    // Calculated
    achievementPct: number;
    
    // Metadata
    inactive?: boolean;
    isCurrentTeamMember?: boolean;
    role?: string;
    uploadedAt?: string;
}
```

### 2. Data Processing Logic

**File:** `src/data/dataProcess.ts`

Updated `getKPIData()` function to:
- Sum ALL persisted numeric fields
- Calculate achievement % directly: `(closedPoints / target) * 100`
- Use `points`, `incomplete`, `cancellation`, `targetPct` when available
- Maintain backward compatibility with older records

---

## Backward Compatibility Strategy

### Handling Previously Uploaded Data

**Situation:** What about records uploaded before this architecture change?

**Solution:**

1. **Migration Script** (if needed):
   ```javascript
   // backend/migration.js can populate missing fields
   db.collection('sales_records').updateMany(
       { points: { $exists: false } },
       { $set: { 
           points: 0,
           incomplete: 0,
           targetPct: 0,
           // etc.
       }}
   )
   ```

2. **Defensive Frontend Code:**
   - All KPI calculations use `|| 0` fallback
   - Charts handle missing fields gracefully
   - No crashes if field is undefined

3. **Upload Endpoint:**
   - Only NEW uploads validated strictly
   - Existing data never re-validated or modified
   - Queries work with mixed old/new data

### Example: Safe Field Access
```typescript
// Good ✓ - Handles missing fields
const target = r.target || 0;
const points = (r.points || 0);
const achievement = target > 0 ? (points / target) * 100 : 0;

// Avoid ✗ - Crashes if field is undefined
const achievement = r.closedPoints / r.target * 100;
```

---

## Upload Workflow (New)

### User Perspective

1. **Prepare file** with required columns
2. **Upload** via UI
3. **System validates headers** → Returns immediate feedback
4. **If valid:** Data uploaded to database
5. **If invalid:** Clear error message lists missing columns

### System Perspective

```
File Upload
    ↓
Parse CSV/Excel
    ↓
Extract Headers
    ↓
Validate Headers (STRICT)
    ├─ Check all 13 required headers present
    ├─ Check for duplicates
    └─ Check for unexpected headers
    ↓
IF INVALID → Return 400 with error list
    ↓
Map Headers (standard → file column names)
    ↓
Transform Data
    ├─ Extract all 13 fields using mapping
    ├─ Coerce types (strings, numbers)
    ├─ Default missing numeric fields to 0
    ├─ Calculate achievementPct
    └─ Handle row-level errors
    ↓
Upload to MongoDB
    ├─ Insert new records
    └─ Log any failures
    ↓
Return Success Report
    ├─ Total rows processed
    ├─ Success count
    ├─ Rejected rows with reasons
    └─ Header mapping used
```

---

## Configuration & Constants

### Header Validation Config Location
**File:** `backend/server.js`
- Lines 177-242: `ALLOWED_HEADERS` object
- Lines 244-370: `HEADER_NORMALIZATION_PATTERNS` object

### Why Two Objects?

**`ALLOWED_HEADERS`** - "What fields do we need?"
- Definition of all valid headers
- Database field mappings
- Type information
- Required/optional status

**`HEADER_NORMALIZATION_PATTERNS`** - "How do users spell it?"
- Maps user input to standard names
- Handles variations: spacing, case, special characters
- Allows flexibility while maintaining consistency

---

## Error Handling Examples

### Missing Header
**User Input:** File without "Closed Point" column

**System Response:**
```json
{
    "error": "File has invalid headers",
    "missingHeaders": ["Closed Point"],
    "allErrors": ["Missing required headers: Closed Point"]
}
```

### Duplicate Header
**User Input:** Two columns named "Team Leader" and "TEAM LEADER"

**System Response:**
```json
{
    "error": "File has invalid headers",
    "allErrors": ["Duplicate header detected: 'TEAM LEADER' maps to 'Team Leader' (already found)"]
}
```

### Unknown Header (Allowed)
**User Input:** Extra column "Manager Notes"

**System Response:**
- Logs warning but doesn't fail
- Extra column is ignored
- Upload proceeds if all required headers present

### Row-Level Error
**User Input:** Row 45 missing BDE name

**System Response:**
```json
{
    "rejectedRows": [
        { "rowNumber": 45, "reason": "Missing required BDE name" }
    ],
    "summary": {
        "totalRows": 100,
        "successfulRows": 99,
        "rejectedRows": 1
    }
}
```

---

## Future Enhancements

### Easy to Add New Headers

To add a new required field in the future:

1. Add to `ALLOWED_HEADERS`:
   ```javascript
   'New Header': { required: true, dbField: 'newField', type: 'number', defaultValue: 0 }
   ```

2. Add patterns to `HEADER_NORMALIZATION_PATTERNS`:
   ```javascript
   'newheader': 'New Header',
   'new_header': 'New Header',
   'newfield': 'New Header'
   ```

3. Update frontend `SalesRecord` interface
4. Update data processing logic

**No changes needed to:**
- Validation logic
- Transformation logic
- Upload endpoint

---

## Testing Checklist

- [ ] Upload file with all required headers → Success
- [ ] Upload file missing one header → 400 error with list
- [ ] Upload file with duplicate headers → 400 error
- [ ] Upload file with extra columns → Success (ignored)
- [ ] Upload file with invalid month → Row rejected, others processed
- [ ] Upload file with missing numeric values → 0 used
- [ ] Charts use persisted fields correctly
- [ ] KPIs calculate from persisted data
- [ ] Role-based filters still work
- [ ] Month/branch filters operate on persisted fields
- [ ] Existing data (pre-migration) still works
- [ ] Admin view shows headers used in upload

---

## Support & Maintenance

### Common Issues

**Issue:** "File has invalid headers"
- **Check:** Verify all 13 required columns present
- **Solution:** Compare file headers against required list provided in error

**Issue:** Some rows processed, some rejected
- **Check:** Look at `rejectedRows` array in response
- **Solution:** Fix invalid data and re-upload

**Issue:** Charts show no data
- **Check:** Verify records have `month` field populated
- **Solution:** Ensure month normalization is working

---

## Summary

This architecture change provides:

✅ **Guaranteed Data Consistency** - All fields persisted for all records
✅ **Early Validation** - Headers checked before any data processing
✅ **Clear Error Messages** - Users know exactly what's wrong
✅ **Backward Compatible** - Existing data unaffected
✅ **Future-Proof** - Easy to add new headers
✅ **Reliable Dashboards** - Charts/KPIs have consistent data source
✅ **Audit Trail** - Upload timestamp and mapping recorded
