# CSV/Excel Upload Requirements

**Quick Reference for File Preparation**

## Required Columns (13 total)

Your file **MUST** contain these columns (exact spelling, order doesn't matter):

1. **FY** - Fiscal Year (e.g., "2025")
2. **Month** - Month name (April, May, June, etc.)
3. **DBM** - Deputy Branch Manager name
4. **Team Leader** - Team lead name (variants accepted: "Team Lead", "TL", "teamleader", etc.)
5. **BDE** - Business Development Executive name
6. **Target** - Sales target (number)
7. **Admissions** - Total admissions (number)
8. **Points** - Points earned (number)
9. **Closed Admissions** - Closed/finalized admissions (number)
10. **Cancellation/Backout** - Cancellations (variants: "Cancellation", "Backout", "Cancelation")
11. **Incomplete Form** - Incomplete forms (number)
12. **Closed Point** - Points on closed admissions (number)
13. **Target %** - Target achievement percentage (number)

## Accepted Column Header Variations

The system is flexible with spelling and formatting:

| Official Name | Accepted Variants |
|---|---|
| FY | Year, Financial Year, Fiscal Year |
| Month | month |
| DBM | Deputy Branch Manager, Deputy Branch Mgr |
| Team Leader | Team Lead, TL, teamleader, team_leader, team-leader |
| BDE | Business Development Executive, bde_name |
| Target | target |
| Admissions | Admission |
| Points | points |
| Closed Admissions | Closed Admissions, closed_admissions |
| Cancellation/Backout | Cancellation, Backout, Cancelation, cancellation_backout |
| Incomplete Form | Incomplete_Form, incomplete form, Incomplete |
| Closed Point | Closed Points, closed_points, CLOSED POINT |
| Target % | Target %, Target%, Target Pct, target_percent |

**All variations are case-insensitive and spacing-flexible!**

## Data Type Requirements

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| FY | Text | ✅ | "2025" | Year value |
| Month | Text | ✅ | - | Must be valid month |
| DBM | Text | ✅ | - | Person name |
| Team Leader | Text | ✅ | - | Person name |
| BDE | Text | ✅ | - | Person name, required |
| Target | Number | ✅ | 0 | Will use 0 if empty |
| Admissions | Number | ✅ | 0 | Will use 0 if empty |
| Points | Number | ✅ | 0 | Will use 0 if empty |
| Closed Admissions | Number | ✅ | 0 | Will use 0 if empty |
| Cancellation/Backout | Number | ✅ | 0 | Will use 0 if empty |
| Incomplete Form | Number | ✅ | 0 | Will use 0 if empty |
| Closed Point | Number | ✅ | 0 | Will use 0 if empty |
| Target % | Number | ✅ | 0 | Will use 0 if empty |

## Valid Months

The system recognizes these month values (case-insensitive):

```
April, May, June, July, August, September,
October, November, December, January, February, March
```

Or short forms: `Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar`

## Upload Rules

✅ **DO:**
- Include all 13 required columns
- Use sensible column names (variations are handled)
- Provide data for all rows
- Use numbers for numeric columns
- Use text for name fields

❌ **DON'T:**
- Leave out any required column - upload will be rejected
- Use duplicate columns (e.g., two "Team Leader" columns)
- Leave FY, Month, DBM, Team Leader, BDE empty - rows will be rejected
- Use special characters in numeric fields

## Example Valid File

```
FY,Month,DBM,Team Leader,BDE,Target,Admissions,Points,Closed Admissions,Cancellation/Backout,Incomplete Form,Closed Point,Target %
2025,April,Rajesh Kumar,Priya Singh,Amit Patel,100,85,75,80,5,2,75,75
2025,April,Rajesh Kumar,Priya Singh,Neha Sharma,120,95,88,90,4,3,88,73
2025,April,Vikram Gupta,Rohit Verma,Deepak Nair,80,60,55,58,3,1,55,69
```

## Example File That Will Be REJECTED

```
FY,Month,DBM,TeamLeader,Executive
2025,April,Rajesh,Priya,Amit
```

**Why rejected:**
- Missing "BDE" column (used "Executive" instead - unknown header)
- Missing "Target", "Admissions", "Points" etc. (numeric columns)
- Not enough required columns

## Upload Process

1. **Prepare** your file with all 13 required columns
2. **Check** that headers match accepted variations above
3. **Upload** via the dashboard
4. **System validates** headers automatically
5. **Immediate feedback:**
   - ✅ If valid → Records imported, success message
   - ❌ If invalid → Error message lists missing columns

## Troubleshooting

| Error | Reason | Solution |
|-------|--------|----------|
| "Missing required headers" | File lacks required columns | Add the missing columns to your file |
| "Duplicate header detected" | Two columns map to same header | Rename one of the duplicate columns |
| "No valid data rows" | All rows were rejected | Check Month values, ensure BDE column exists |
| "File has invalid headers" | Required columns missing | Review Required Columns section above |

## Contact Support

If your file meets all requirements but still fails upload:
1. Note the exact error message
2. Share the column headers from your file
3. Check that all person names (DBM, Team Leader, BDE) exist in the system

---

**Helpful Tip:** The system is designed to be flexible with header spelling but strict about having all required data. This ensures your dashboards, charts, and reports always have consistent, complete data to work with.
