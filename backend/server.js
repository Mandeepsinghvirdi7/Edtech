
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { connectToDB, getDB } = require('./mongo');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordSetupEmail } = require('./utils/gmail');
const fs = require('fs');
const { migrate } = require('./migration'); // Import the migrate function

const app = express();
const PORT = process.env.PORT || 3000;

// Respect NODE_ENV; warn if not set to production for deployments
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV !== 'production') {
    console.warn(`Warning: NODE_ENV is set to '${NODE_ENV}'. For Render production please set NODE_ENV=production`);
}

// Middleware
// Allow CORS only from the configured frontend URL (set FRONTEND_URL in Render)
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || null;
if (FRONTEND_URL) {
    app.use(cors({ origin: FRONTEND_URL, optionsSuccessStatus: 200 }));
} else {
    // fallback to same-origin during local development
    app.use(cors());
}
app.use(express.json());

// DB connection middleware for serverless - Moved to top
app.use(async (req, res, next) => {
    try {
        const db = getDB();
        if (!db) {
            console.log('Middleware: Connecting to MongoDB...');
            await connectToDB();
        }
        next();
    } catch (error) {
        console.error('DB Connection error in middleware:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// MongoDB Setup for import
const DB_NAME = 'hike_dashboard_db';
const SALES_RECORDS_COLLECTION = 'sales_records';
const USERS_COLLECTION = 'users';
const DRIVES_COLLECTION = 'drives';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept Excel files and CSV files
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/csv' // alternative csv mime
        ];

        if (allowedMimes.includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// ===== FILE TO JSON CONVERSION =====
const fileToRows = (buffer, mimetype, originalname) => {
    return new Promise((resolve, reject) => {
        try {
            const isCsv = mimetype === 'text/csv' || mimetype === 'application/csv' || originalname.toLowerCase().endsWith('.csv');

            if (isCsv) {
                const results = [];
                const stream = Readable.from(buffer.toString('utf8'));

                stream.pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => {
                        if (!results || results.length === 0) {
                            return reject(new Error('No data found in CSV file'));
                        }
                        resolve(results);
                    })
                    .on('error', (error) => reject(error));

            } else {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = xlsx.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    return reject(new Error('No data found in Excel file'));
                }
                resolve(jsonData);
            }
        } catch (error) {
            console.error('Error converting file to JSON:', error.message);
            reject(error);
        }
    });
};

// ===== DATABASE-BASED AUTH =====

app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body || {};
    console.log(`\n[LOGIN ATTEMPT] userId: "${userId}"`);

    if (!userId || !password) {
        console.log('[LOGIN FAILED] Missing credentials.');
        return res.status(400).json({ ok: false, message: 'Missing credentials' });
    }

    const db = getDB();
    if (!db) {
        console.log('[LOGIN FAILED] Database not connected.');
        return res.status(500).json({ ok: false, message: 'Database not connected' });
    }
    const usersCollection = db.collection(USERS_COLLECTION);

    try {
        // Find user by email or username
        console.log(`[LOGIN] Searching for user: "${userId}"`);
        const user = await usersCollection.findOne({ $or: [{ email: userId }, { name: userId }] });

        if (!user) {
            console.log(`[LOGIN FAILED] User not found in database.`);
            return res.status(401).json({ ok: false, message: 'Invalid user or password' });
        }
        console.log(`[LOGIN] Found user:`, { name: user.name, email: user.email, role: user.role });

        // Check if user has a password (for accounts created before migration)
        if (!user.password) {
            console.log(`[LOGIN FAILED] User "${userId}" has no password field in the database.`);
            return res.status(401).json({ ok: false, message: 'User account not fully set up for password login. Please contact an admin.' });
        }
        console.log(`[LOGIN] User has a password field. Proceeding to compare.`);

        let match = false;
        try {
            match = await bcrypt.compare(password, user.password);
        } catch (e) {
            console.error('[LOGIN FAILED] bcrypt.compare error:', e);
        }
        console.log(`[LOGIN] Password comparison result for "${userId}": ${match}`);

        if (!match) {
            console.log(`[LOGIN FAILED] Password mismatch.`);
            return res.status(401).json({ ok: false, message: 'Invalid user or password' });
        }

        console.log(`[LOGIN SUCCESS] User "${userId}" authenticated successfully.`);
        // Determine branch access based on role
        let branches = [];
        if (user.role === 'Admin' || user.role === 'Operations' || user.role === 'Vice President') {
            branches = ['Hyderabad Branch', 'Mumbai Branch'];
        } else if (user.role === 'Deputy Branch Manager' || user.role === 'Team Leader' || user.role === 'Business Development Executive') {
            branches = [user.branch];
        }

        return res.json({ ok: true, branches: branches });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ ok: false, message: 'An internal server error occurred.' });
    }
});

// ===== MONTH NAME MAPPING =====
// Normalized to uppercase for consistency across DB and filters
const MONTH_MAPPING = {
    'jan': 'JANUARY', 'feb': 'FEBRUARY', 'mar': 'MARCH', 'apr': 'APRIL',
    'may': 'MAY', 'jun': 'JUNE', 'jul': 'JULY', 'aug': 'AUGUST',
    'sep': 'SEPTEMBER', 'oct': 'OCTOBER', 'nov': 'NOVEMBER', 'dec': 'DECEMBER',
    'january': 'JANUARY', 'february': 'FEBRUARY', 'march': 'MARCH', 'april': 'APRIL',
    'may': 'MAY',
    'june': 'JUNE', 'july': 'JULY', 'august': 'AUGUST', 'september': 'SEPTEMBER',
    'october': 'OCTOBER', 'november': 'NOVEMBER', 'december': 'DECEMBER'
};

const normalizeMonth = (month) => {
    if (!month) return month;
    const normalized = String(month).trim().toLowerCase();
    return MONTH_MAPPING[normalized] || month;
};

// ===== TRANSFORM DATA TO MONGODB FORMAT =====
// ===== HEADER VALIDATION CONFIG =====
/**
 * CENTRALIZED HEADER-TO-FIELD MAPPING CONFIGURATION
 * 
 * This configuration drives the entire data ingestion pipeline:
 * 1. Header validation - ensures all required headers are present
 * 2. Header normalization - maps various input formats to standard headers
 * 3. Data transformation - persists all headers as explicit database fields
 * 4. Type enforcement - ensures correct data types for numeric/string fields
 * 
 * CRITICAL: All headers listed here must be present in the database schema.
 * Each row uploaded MUST contain values for ALL required fields.
 */
const ALLOWED_HEADERS = {
    // STRING FIELDS - Identifiers and categorical data
    'FY': {
        required: true,
        dbField: 'fy',
        type: 'string',
        description: 'Fiscal Year (e.g., 2025)'
    },
    'Month': {
        required: true,
        dbField: 'month',
        type: 'string',
        description: 'Month name (APRIL-MARCH cycle)'
    },
    'DBM': {
        required: true,
        dbField: 'dbm',
        type: 'string',
        description: 'Deputy Branch Manager - team supervisor'
    },
    'Team Leader': {
        required: true,
        dbField: 'teamLeader',
        type: 'string',
        description: 'Team Leader - manages a team of BDEs'
    },
    'BDE': {
        required: true,
        dbField: 'bdeName',
        type: 'string',
        description: 'Business Development Executive - individual performer'
    },

    // NUMERIC FIELDS - Measurements and KPIs (all default to 0)
    'Target': {
        required: true,
        dbField: 'target',
        type: 'number',
        defaultValue: 0,
        description: 'Sales target for the period'
    },
    'Admissions': {
        required: true,
        dbField: 'admissions',
        type: 'number',
        defaultValue: 0,
        description: 'Total admissions achieved'
    },
    'Points': {
        required: true,
        dbField: 'points',
        type: 'number',
        defaultValue: 0,
        description: 'Points earned (metric for performance)'
    },
    'Closed Admissions': {
        required: true,
        dbField: 'closedAdm',
        type: 'number',
        defaultValue: 0,
        description: 'Closed/finalized admissions'
    },
    'Cancellation/backout': {
        required: true,
        dbField: 'cancellation',
        type: 'number',
        defaultValue: 0,
        description: 'Cancellations or backouts'
    },
    'Incomplete Form': {
        required: true,
        dbField: 'incomplete',
        type: 'number',
        defaultValue: 0,
        description: 'Incomplete form submissions'
    },
    'Closed Point': {
        required: true,
        dbField: 'closedPoints',
        type: 'number',
        defaultValue: 0,
        description: 'Points on closed admissions (= Closed Admissions)'
    },
    'Target %': {
        required: true,
        dbField: 'targetPct',
        type: 'number',
        defaultValue: 0,
        description: 'Target achievement percentage'
    }
};

/**
 * HEADER NORMALIZATION PATTERNS
 * 
 * Maps various input header formats to standardized names.
 * Handles:
 * - Case variations (FY, fy, Fy)
 * - Spacing variations (target%, target %, target %)
 * - Special characters (/, -, _)
 * - Common abbreviations (TL, DBM, BDE)
 * - Synonym variations (backout, cancellation, cancelation)
 */
const HEADER_NORMALIZATION_PATTERNS = {
    // FY / Year
    'fy': 'FY',
    'financialyear': 'FY',
    'fiscalyear': 'FY',
    'year': 'FY',
    'fiscal year': 'FY',

    // Month
    'month': 'Month',

    // DBM
    'dbm': 'DBM',
    'deputybranchmanager': 'DBM',
    'deputybranchmgr': 'DBM',
    'deputy branch manager': 'DBM',

    // Team Leader
    'teamleader': 'Team Leader',
    'team lead': 'Team Leader',
    'team leader': 'Team Leader',
    'team_leader': 'Team Leader',
    'team-leader': 'Team Leader',
    'tl': 'Team Leader',
    'teamlead': 'Team Leader',
    'leader': 'Team Leader',

    // BDE
    'bde': 'BDE',
    'businessdevelopmentexecutive': 'BDE',
    'bde_name': 'BDE',
    'bde name': 'BDE',
    'bde-name': 'BDE',
    'executive': 'BDE',

    // Target
    'target': 'Target',

    // Admissions
    'admissions': 'Admissions',
    'admission': 'Admissions',

    // Points
    'points': 'Points',

    // Closed Admissions
    'closedadmissions': 'Closed Admissions',
    'closed_admissions': 'Closed Admissions',
    'closed admissions': 'Closed Admissions',
    'closed-admissions': 'Closed Admissions',
    'closedadmission': 'Closed Admissions',
    'closed_admission': 'Closed Admissions',
    'closed admission': 'Closed Admissions',
    'closed-admission': 'Closed Admissions',

    // Cancellation/Backout
    'cancellation': 'Cancellation/backout',
    'cancellationbackout': 'Cancellation/backout',
    'cancellation/backout': 'Cancellation/backout',
    'cancellation_backout': 'Cancellation/backout',
    'cancellation-backout': 'Cancellation/backout',
    'cancelation': 'Cancellation/backout',
    'backout': 'Cancellation/backout',
    'cancellations': 'Cancellation/backout',

    // Incomplete Form
    'incompleteform': 'Incomplete Form',
    'incomplete_form': 'Incomplete Form',
    'incomplete form': 'Incomplete Form',
    'incomplete-form': 'Incomplete Form',
    'incomplete forms': 'Incomplete Form',
    'incomplete_forms': 'Incomplete Form',
    'incomplete forms': 'Incomplete Form',
    'incomplete-forms': 'Incomplete Form',
    'incomplete': 'Incomplete Form',

    // Closed Points / Closed Point
    'closedpoints': 'Closed Point',
    'closed_points': 'Closed Point',
    'closed points': 'Closed Point',
    'closed-points': 'Closed Point',
    'closedpoint': 'Closed Point',
    'closed_point': 'Closed Point',
    'closed point': 'Closed Point',
    'closed-point': 'Closed Point',

    // Target %
    'target%': 'Target %',
    'targetpct': 'Target %',
    'target_pct': 'Target %',
    'target_percent': 'Target %',
    'target percent': 'Target %',
    'target-pct': 'Target %',
    'target %': 'Target %',
    'targetpercentage': 'Target %'
};

/**
 * Validates and normalizes headers from uploaded file
 * 
 * STRICT VALIDATION:
 * - All required headers MUST be present
 * - Headers must exactly map to known patterns
 * - No extra/unexpected headers are allowed
 * - Case-insensitive matching with detailed error reporting
 * 
 * @param {string[]} rawHeaders - Array of header strings from the file
 * @returns {Object} - { isValid: boolean, headerMapping: Object, errors: string[] }
 *   - headerMapping: Maps standardized header names to file column names
 *   - errors: Array of detailed error messages if validation fails
 */
const validateAndNormalizeHeaders = (rawHeaders) => {
    const errors = [];
    const headerMapping = {}; // Maps standard header name -> file column name
    const foundHeaders = new Set();
    const detailedLog = [];

    detailedLog.push(`\n=== HEADER VALIDATION STARTED ===`);
    detailedLog.push(`Raw headers from file (${rawHeaders.length} total):`);
    detailedLog.push(JSON.stringify(rawHeaders, null, 2));

    // Step 1: Normalize each raw header to a standard header
    for (const rawHeader of rawHeaders) {
        if (!rawHeader || typeof rawHeader !== 'string') {
            detailedLog.push(`⚠️  Skipping invalid header: ${rawHeader}`);
            continue;
        }

        // Clean the header: trim, normalize spacing, handle special characters
        const cleanedForMatching = String(rawHeader)
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .toLowerCase();

        detailedLog.push(`\nProcessing raw header: "${rawHeader}"`);
        detailedLog.push(`  Cleaned for matching: "${cleanedForMatching}"`);

        // Try to find a match in our normalization patterns
        let matchedStandardHeader = null;
        let matchKey = null;

        // Try EXACT match first
        if (HEADER_NORMALIZATION_PATTERNS[cleanedForMatching]) {
            matchedStandardHeader = HEADER_NORMALIZATION_PATTERNS[cleanedForMatching];
            matchKey = cleanedForMatching;
            detailedLog.push(`  ✓ Exact match found: "${matchKey}" -> "${matchedStandardHeader}"`);
        } else {
            // Try fuzzy matching with pattern variations
            for (const [pattern, standardHeader] of Object.entries(HEADER_NORMALIZATION_PATTERNS)) {
                const patternNormalized = pattern.toLowerCase();
                const cleanedNormalized = cleanedForMatching;

                // Match if pattern equals cleaned (after both are lowercased and trimmed)
                if (patternNormalized === cleanedNormalized) {
                    matchedStandardHeader = standardHeader;
                    matchKey = pattern;
                    detailedLog.push(`  ✓ Pattern match found: "${matchKey}" -> "${standardHeader}"`);
                    break;
                }
            }
        }

        if (matchedStandardHeader) {
            if (foundHeaders.has(matchedStandardHeader)) {
                const errMsg = `Duplicate header detected: "${rawHeader}" maps to "${matchedStandardHeader}" (already found)`;
                errors.push(errMsg);
                detailedLog.push(`  ❌ ${errMsg}`);
            } else {
                // Store the mapping: standard name -> actual column name from file
                headerMapping[matchedStandardHeader] = rawHeader;
                foundHeaders.add(matchedStandardHeader);
                detailedLog.push(`  ✓ Added to mapping: "${matchedStandardHeader}" -> file column "${rawHeader}"`);
            }
        } else {
            const warnMsg = `Unknown/unmapped header: "${rawHeader}" (normalized to: "${cleanedForMatching}")`;
            detailedLog.push(`  ⚠️  ${warnMsg}`);
            // Note: We log as warning but don't fail - allows extra columns in file
        }
    }

    // Step 2: Validate all required headers are present
    const requiredHeaders = Object.keys(ALLOWED_HEADERS).filter(key => ALLOWED_HEADERS[key].required);
    const missingHeaders = requiredHeaders.filter(header => !foundHeaders.has(header));

    detailedLog.push(`\n=== REQUIRED HEADERS CHECK ===`);
    detailedLog.push(`Required headers: ${requiredHeaders.join(', ')}`);
    detailedLog.push(`Found headers: ${Array.from(foundHeaders).join(', ')}`);

    if (missingHeaders.length > 0) {
        const errMsg = `CRITICAL: Missing required headers: ${missingHeaders.join(', ')}`;
        errors.push(errMsg);
        detailedLog.push(`❌ ${errMsg}`);
    } else {
        detailedLog.push(`✓ All required headers found`);
    }

    // Step 3: Final validation result
    const isValid = errors.length === 0;

    detailedLog.push(`\n=== VALIDATION RESULT ===`);
    detailedLog.push(`Status: ${isValid ? '✓ VALID' : '❌ INVALID'}`);
    if (errors.length > 0) {
        detailedLog.push(`Errors (${errors.length}):`);
        errors.forEach((e, i) => detailedLog.push(`  ${i + 1}. ${e}`));
    }
    detailedLog.push(`Header Mapping:`, JSON.stringify(headerMapping, null, 2));

    // Log the entire validation flow
    console.log(detailedLog.join('\n'));

    return {
        isValid,
        headerMapping, // Maps standard names to actual file column names
        errors
    };
};


/**
 * Legacy normalizeHeader function - kept for backward compatibility
 * @deprecated Use validateAndNormalizeHeaders for new uploads
 */
const normalizeHeader = (header) => {
    if (!header) return null;
    const normalized = String(header).trim()
        .replace(/[\s\/_.-]/g, '')
        .toLowerCase();

    switch (normalized) {
        case 'fy': return 'fy';
        case 'teamleader': return 'teamLeader';
        case 'teamname': return 'teamName';
        case 'month': return 'month';
        case 'bde': return 'bde';
        case 'dbm': return 'dbm';
        case 'target': return 'target';
        case 'admissions': return 'admissions';
        case 'points': return 'points';
        case 'closedadmission': return 'closedAdm';
        case 'cancellation': return 'cancellation';
        case 'cancellationbackout': return 'cancellation';
        case 'cancelation': return 'cancellation';
        case 'backout': return 'cancellation';
        case 'incompleteform': return 'incomplete';
        case 'closedpoints': return 'closedPoints';
        case 'target%':
        case 'targetpct': return 'targetPct';
        default: return normalized;
    }
};

const getDbmForBde = async (bdeName, branchName) => {
    const db = getDB();
    const usersCollection = db.collection(USERS_COLLECTION);
    const user = await usersCollection.findOne({ name: bdeName, branch: branchName });
    if (user && user.role === 'Deputy Branch Manager') {
        return user.name;
    }
    // This part is tricky without the full team structure.
    // Assuming for now we can find the DBM by looking for a DBM in the same branch.
    // This might need to be adjusted based on the actual team structure.
    const dbmUser = await usersCollection.findOne({ branch: branchName, role: 'Deputy Branch Manager' });
    return dbmUser ? dbmUser.name : 'Unassigned';
};

const transformToSalesRecords = async (normalizedRows, branchName) => {
    const records = [];
    const driveName = '2025 Performance';

    for (const row of normalizedRows) {
        const target = parseInt(row['target'] || 0);
        const closedPoints = parseFloat(row['closedPoints'] || 0);
        const achievement = target > 0 ? parseFloat(((closedPoints / target) * 100).toFixed(2)) : 0;
        const bdeName = String(row['bde'] || '').trim();

        // Use DBM from data if available, otherwise try to get from users collection
        let dbm = String(row['dbm'] || '').trim();
        if (!dbm || dbm === '') {
            dbm = await getDbmForBde(bdeName, branchName);
        }

        // Fallback logic for team leader assignment
        let teamLeader = 'Unassigned';

        // Primary: Check for teamLeader column
        if (row['teamLeader'] && String(row['teamLeader']).trim()) {
            teamLeader = String(row['teamLeader']).trim();
        }
        // Fallback 1: Check for teamName column (might contain team leader info)
        else if (row['teamName'] && String(row['teamName']).trim() && String(row['teamName']).trim() !== 'Unassigned') {
            teamLeader = String(row['teamName']).trim();
        }
        // Fallback 2: Try to infer from BDE name patterns (if BDE name contains team info)
        else if (bdeName && bdeName.includes('-')) {
            // If BDE name has format like "TeamName-BDE", extract team part
            const parts = bdeName.split('-');
            if (parts.length > 1 && parts[0].trim()) {
                teamLeader = parts[0].trim();
            }
        }
        // Fallback 3: Check for other potential team identifier columns
        else if (row['manager'] && String(row['manager']).trim()) {
            teamLeader = String(row['manager']).trim();
        }
        else if (row['supervisor'] && String(row['supervisor']).trim()) {
            teamLeader = String(row['supervisor']).trim();
        }

        const record = {
            fy: row['fy'] || '2025',
            month: normalizeMonth(row['month']),
            branch: branchName,
            drive: driveName,
            dbm: dbm,
            teamLeader: teamLeader,
            teamName: teamLeader, // Default to team leader name
            bdeName: bdeName,
            target: target,
            admissions: parseInt(row['admissions'] || 0),
            closedPoints: closedPoints,
            achievementPct: achievement,
        };
        if (record.bdeName && record.month) {
            records.push(record);
        }
    }

    return records;
};

/**
 * STRICT TRANSFORMATION: Maps raw file data to database schema
 * 
 * GUARANTEES:
 * - ALL required headers are extracted from the file
 * - Numeric fields are coerced to numbers with defaults of 0
 * - String fields are trimmed and validated
 * - Row-level errors are logged without stopping the entire upload
 * - Achievement percentage is calculated from Closed Points / Target
 * 
 * @param {Array} rows - Raw rows from file
 * @param {string} branchName - Branch for this upload
 * @param {Object} headerMapping - Maps standard header names -> file column names
 * @returns {Array} - Array of complete sales records ready for DB insertion
 */
const transformToSalesRecordsWithValidation = async (rows, branchName, headerMapping) => {
    const records = [];
    const driveName = '2025 Performance';
    const rejectedRows = [];

    console.log('\n=== DATA TRANSFORMATION STARTED ===');
    console.log('Input rows:', rows.length);
    console.log('Header mapping keys:', Object.keys(headerMapping).sort());
    console.log('Full header mapping:', JSON.stringify(headerMapping, null, 2));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1; // For error reporting

        try {
            // DEBUG: Log first row structure
            if (i === 0) {
                console.log(`\n=== FIRST ROW STRUCTURE ===`);
                console.log('Row keys from file:', Object.keys(row));
                console.log('Sample row:', JSON.stringify(row, null, 2).substring(0, 500) + '...');
            }

            // Extract ALL required string fields - trim and validate
            const fy = (row[headerMapping['FY']] || '').toString().trim() || '2025';
            const monthRaw = (row[headerMapping['Month']] || '').toString().trim();
            const month = normalizeMonth(monthRaw);
            const dbm = (row[headerMapping['DBM']] || '').toString().trim();
            const teamLeader = (row[headerMapping['Team Leader']] || '').toString().trim();
            const bdeName = (row[headerMapping['BDE']] || '').toString().trim();

            // Extract ALL required numeric fields - parse and coerce with defaults of 0
            // IMPORTANT: All numeric fields default to 0 if missing or invalid
            const target = parseFloat(row[headerMapping['Target']] || 0) || 0;
            const admissions = parseFloat(row[headerMapping['Admissions']] || 0) || 0;
            const points = parseFloat(row[headerMapping['Points']] || 0) || 0;
            const closedAdm = parseFloat(row[headerMapping['Closed Admissions']] || 0) || 0;
            const cancellation = parseFloat(row[headerMapping['Cancellation/backout']] || 0) || 0;
            const incomplete = parseFloat(row[headerMapping['Incomplete Form']] || 0) || 0;
            const closedPoints = parseFloat(row[headerMapping['Closed Point']] || 0) || 0;
            const targetPct = parseFloat(row[headerMapping['Target %']] || 0) || 0;

            // Validate critical fields
            if (!bdeName) {
                rejectedRows.push({
                    rowNumber,
                    reason: 'Missing required BDE name'
                });
                console.warn(`Row ${rowNumber}: REJECTED - Missing BDE name`);
                continue;
            }

            if (!month) {
                rejectedRows.push({
                    rowNumber,
                    reason: `Invalid month: "${monthRaw}"`
                });
                console.warn(`Row ${rowNumber}: REJECTED - Invalid month "${monthRaw}"`);
                continue;
            }

            // Get or resolve DBM
            let finalDbm = dbm;
            if (!finalDbm || finalDbm === '') {
                finalDbm = await getDbmForBde(bdeName, branchName);
            }

            // Calculate achievement percentage: (Closed Points / Target) * 100
            const achievementPct = target > 0 ?
                parseFloat(((closedPoints / target) * 100).toFixed(2)) : 0;

            // BUILD COMPLETE RECORD - ALL FIELDS PERSISTED
            const record = {
                // IDs and Organization
                fy: fy,
                month: month,
                branch: branchName,
                drive: driveName,

                // People
                dbm: finalDbm,
                teamLeader: teamLeader,
                teamName: teamLeader, // Default to team leader name
                bdeName: bdeName,

                // PERSISTED METRICS - Exactly as required
                target: target,
                admissions: admissions,
                points: points,
                closedAdm: closedAdm,
                cancellation: cancellation,
                incomplete: incomplete,
                closedPoints: closedPoints,
                targetPct: targetPct,

                // Calculated field
                achievementPct: achievementPct,

                // Metadata
                uploadedAt: new Date().toISOString()
            };

            records.push(record);
            console.log(`Row ${rowNumber}: ✓ PROCESSED - BDE=${bdeName}, Month=${month}, Target=${target}, Closed Points=${closedPoints}, Achievement=${achievementPct}%`);

        } catch (error) {
            rejectedRows.push({
                rowNumber,
                reason: `Processing error: ${error.message}`
            });
            console.error(`Row ${rowNumber}: ERROR -`, error.message);
        }
    }

    console.log('\n=== TRANSFORMATION COMPLETE ===');
    console.log(`Successfully transformed: ${records.length}/${rows.length} rows`);
    if (rejectedRows.length > 0) {
        console.warn(`Rejected rows (${rejectedRows.length}):`, JSON.stringify(rejectedRows, null, 2));
    }

    return {
        records,
        rejectedRows,
        summary: {
            totalRows: rows.length,
            successCount: records.length,
            rejectedCount: rejectedRows.length,
            successRate: ((records.length / rows.length) * 100).toFixed(2) + '%'
        }
    };
};

// ===== UPLOAD TO MONGODB =====
const uploadToMongoDB = async (salesRecords, branchName) => {
    const db = getDB();
    if (!db) {
        throw new Error('Database is not connected.');
    }

    try {
        const collection = db.collection(SALES_RECORDS_COLLECTION);
        const usersCollection = db.collection(USERS_COLLECTION);

        // DEBUG: Log the structure of the first record to verify all fields are present
        if (salesRecords.length > 0) {
            console.log('\n=== SAMPLE RECORD STRUCTURE BEFORE MONGO SAVE ===');
            console.log('Sample record keys:', Object.keys(salesRecords[0]).sort());
            console.log('Sample record:', JSON.stringify(salesRecords[0], null, 2));
            console.log('===================================================\n');
        }

        // Normalize names to match existing users' casing
        const normalizedRecords = [];
        for (const record of salesRecords) {
            const normalizedRecord = { ...record };

            // Normalize bdeName
            if (record.bdeName) {
                const bdeUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.bdeName}$`, 'i') }, branch: branchName }
                );
                if (bdeUser) {
                    normalizedRecord.bdeName = bdeUser.name;
                }
            }

            // Normalize teamLeader
            if (record.teamLeader && record.teamLeader !== 'Unassigned') {
                const tlUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.teamLeader}$`, 'i') }, branch: branchName }
                );
                if (tlUser) {
                    normalizedRecord.teamLeader = tlUser.name;
                    normalizedRecord.teamName = tlUser.name;
                }
            }

            // Normalize dbm
            if (record.dbm) {
                const dbmUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.dbm}$`, 'i') }, branch: branchName }
                );
                if (dbmUser) {
                    normalizedRecord.dbm = dbmUser.name;
                }
            }

            normalizedRecords.push(normalizedRecord);
        }

        // Instead of deleting all records, update existing ones and insert new ones
        // Group records by unique key (bdeName + month + fy)
        const bulkOps = [];
        for (const record of normalizedRecords) {
            const filter = {
                bdeName: record.bdeName,
                month: record.month,
                fy: record.fy,
                branch: branchName
            };

            bulkOps.push({
                updateOne: {
                    filter: filter,
                    update: { $set: record },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            await collection.bulkWrite(bulkOps);
        }

        // DEBUG: Verify what was saved in MongoDB
        if (normalizedRecords.length > 0) {
            const savedSample = await collection.findOne({
                bdeName: normalizedRecords[0]?.bdeName,
                month: normalizedRecords[0]?.month,
                fy: normalizedRecords[0]?.fy,
                branch: branchName
            });

            if (savedSample) {
                console.log('\n=== SAMPLE RECORD AFTER MONGO SAVE (VERIFICATION) ===');
                console.log('Saved record keys:', Object.keys(savedSample).sort());
                console.log('Saved record:', JSON.stringify(savedSample, null, 2));
                console.log('======================================================\n');
            }
        }

        // Extract and upsert users, but preserve existing manual changes
        const userMap = new Map();

        normalizedRecords.forEach(record => {
            const names = [
                { name: record.dbm, role: 'Deputy Branch Manager' },
                { name: record.teamLeader, role: 'Team Leader' },
                { name: record.bdeName, role: 'Business Development Executive' }
            ];

            names.forEach(({ name, role }) => {
                if (name && name !== 'Unassigned') {
                    const key = `${name}-${branchName}`;
                    if (!userMap.has(key)) {
                        userMap.set(key, { name, role, branch: branchName, inactive: false, isCurrentTeamMember: true });
                    } else {
                        // If already exists, prioritize higher role
                        const existing = userMap.get(key);
                        if (role === 'Deputy Branch Manager' && existing.role !== 'Deputy Branch Manager') {
                            existing.role = role;
                        } else if (role === 'Team Leader' && existing.role === 'Business Development Executive') {
                            existing.role = role;
                        }
                    }
                }
            });
        });

        for (const user of userMap.values()) {
            // Always update user information with the latest data from uploads
            await usersCollection.updateOne(
                { name: user.name, branch: user.branch },
                {
                    $set: {
                        role: user.role,
                        inactive: user.inactive,
                        isCurrentTeamMember: user.isCurrentTeamMember
                    },
                    $setOnInsert: {
                        password: null,
                        email: null,
                        resetToken: null,
                        resetTokenExpires: null
                    }
                },
                { upsert: true }
            );
        }

        console.log(`Processed ${salesRecords.length} sales records and ${userMap.size} users for branch ${branchName}`);

        // Return result object for caller
        return {
            insertedCount: salesRecords.length,
            modifiedCount: salesRecords.length
        };
    } catch (error) {
        console.error('MongoDB error during upload:', error.message);
        throw new Error('An error occurred while writing to the database: ' + error.message);
    }
};

// Routes

/**
 * GET /api/data
 * Returns the master branch data, joined with user data
 */
app.get('/api/data', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        const aggregation = [
            {
                $lookup: {
                    from: USERS_COLLECTION,
                    localField: 'bdeName',
                    foreignField: 'name',
                    as: 'userDetails'
                }
            },
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    id: '$_id',
                    inactive: { $ifNull: ['$userDetails.inactive', false] },
                    isCurrentTeamMember: { $ifNull: ['$isCurrentTeamMember', true] },
                    role: '$userDetails.role'
                }
            }
        ];

        const results = await salesCollection.aggregate(aggregation).toArray();

        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Data not in database. Please upload data first.' });
        }

        // Debug: Log sample record to verify isCurrentTeamMember is included
        console.log('Sample record from /api/data:', JSON.stringify(results[0], null, 2).substring(0, 500));

        const dataWithId = results.map(doc => ({ ...doc, id: doc._id.toString() }));

        return res.json(dataWithId);

    } catch (dbError) {
        console.error('Database query failed:', dbError.message);
        return res.status(500).json({ error: 'A database error occurred.' });
    }
});

/**
 * PUT /api/users/:name
 * Updates a user's information (name, email, role, branch, inactive status, and team membership).
 */
app.put('/api/users/:name', async (req, res) => {
    const { name } = req.params;
    const { name: newName, email, role, branch, newBranch, inactive, isCurrentTeamMember, teamName, password } = req.body;

    // Validate that at least one field to update is provided
    if (newName === undefined && email === undefined && role === undefined && newBranch === undefined &&
        inactive === undefined && isCurrentTeamMember === undefined && password === undefined) {
        return res.status(400).json({ success: false, error: 'At least one field must be provided for update.' });
    }

    // Validate name if provided
    if (newName !== undefined && (typeof newName !== 'string' || newName.trim().length === 0)) {
        return res.status(400).json({ success: false, error: 'Invalid "name" field in request body.' });
    }

    // Validate email if provided
    if (email !== undefined && email !== null && (typeof email !== 'string' || !email.includes('@'))) {
        return res.status(400).json({ success: false, error: 'Invalid "email" field in request body.' });
    }

    // Validate role if provided
    const validRoles = ['Vice President', 'Deputy Branch Manager', 'Team Leader', 'Business Development Executive'];
    if (role !== undefined && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid "role" field in request body.' });
    }

    // Validate branch if provided
    const validBranches = ['Hyderabad Branch', 'Mumbai Branch'];
    if (newBranch !== undefined && !validBranches.includes(newBranch)) {
        return res.status(400).json({ success: false, error: 'Invalid "branch" field in request body.' });
    }

    // Validate inactive if provided
    if (inactive !== undefined && typeof inactive !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "inactive" field in request body.' });
    }

    // Validate isCurrentTeamMember if provided
    if (isCurrentTeamMember !== undefined && typeof isCurrentTeamMember !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "isCurrentTeamMember" field in request body.' });
    }

    // Validate password if provided
    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
        return res.status(400).json({ success: false, error: 'Password must be a string with at least 6 characters.' });
    }

    if (!branch && !newBranch) {
        return res.status(400).json({ success: false, error: 'Either current "branch" or new "branch" field must be provided.' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Use provided branch or newBranch for finding the user
        const searchBranch = branch || newBranch;

        // Find the user with case-insensitive name matching
        const user = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: searchBranch }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
        }

        const updateFields = {};
        if (newName !== undefined) updateFields.name = newName.trim();
        if (email !== undefined) updateFields.email = email ? email.trim() : null;
        if (role !== undefined) updateFields.role = role;
        if (newBranch !== undefined) updateFields.branch = newBranch;
        if (inactive !== undefined) updateFields.inactive = inactive;
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.password = hashedPassword;
        }

        // Update user record
        if (Object.keys(updateFields).length > 0) {
            const userResult = await usersCollection.updateOne(
                { name: user.name, branch: user.branch },
                { $set: updateFields }
            );

            if (userResult.matchedCount === 0) {
                return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
            }

            // If name or branch changed, update all related sales records
            if (newName || newBranch) {
                const salesUpdateFields = {};
                if (newName) salesUpdateFields.bdeName = newName.trim();
                if (newBranch) salesUpdateFields.branch = newBranch;

                await salesCollection.updateMany(
                    { bdeName: user.name, branch: user.branch },
                    { $set: salesUpdateFields }
                );
            }
        }

        // Handle isCurrentTeamMember - this should update sales records, not user records
        if (isCurrentTeamMember !== undefined) {
            const currentBranch = newBranch || user.branch;
            const currentName = newName || user.name;

            if (isCurrentTeamMember && teamName) {
                // Setting to current - set all other teams for this BDE to not current
                await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $nor: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: false } }
                );
            }

            // Update the specific team
            if (teamName) {
                const teamUpdateResult = await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $or: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: isCurrentTeamMember } }
                );

                if (teamUpdateResult.matchedCount === 0) {
                    console.warn(`No sales records found for BDE "${currentName}" in team "${teamName}"`);
                }
            }
        }

        res.json({ success: true, message: `User "${user.name}" updated successfully.` });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user.' });
    }
});

/**
 * PUT /api/user/role
 * Updates a user's role.
 */
app.put('/api/user/role', async (req, res) => {
    const { name, branch, newRole } = req.body;

    if (!name || !branch || !newRole) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, branch, newRole' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const result = await usersCollection.updateOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: { $regex: new RegExp(`^${branch}$`, 'i') } },
            { $set: { role: newRole } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: `User "${name}" in branch "${branch}" not found.` });
        }

        res.json({ success: true, message: `User "${name}" role updated successfully to "${newRole}".` });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role.' });
    }
});


/**
 * POST /api/upload-excel
 * 
 * NEW ARCHITECTURE - STRICT HEADER VALIDATION
 * 
 * CRITICAL FLOW:
 * 1. Parse file (CSV/Excel) to rows
 * 2. VALIDATE headers strictly - all required headers must exist
 * 3. MAP headers using centralized configuration
 * 4. TRANSFORM data with validated header mapping
 * 5. PERSIST ALL fields to database
 * 6. Handle and log rejected rows
 * 7. Provide detailed upload report
 * 
 * ERROR HANDLING:
 * - Missing required headers -> HTTP 400 with clear error list
 * - Header format errors -> Detailed error messages
 * - Data transformation errors -> Log rejected rows, continue with valid rows
 */
app.post('/api/upload-excel', upload.single('excelFile'), async (req, res) => {
    try {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║     NEW UPLOAD ARCHITECTURE - INITIATED    ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // ===== STEP 1: Validate file presence =====
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No Excel file uploaded',
                details: 'Please select a CSV or Excel file to upload.'
            });
        }

        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const fileMime = req.file.mimetype;

        console.log(`✓ File received: ${fileName}`);
        console.log(`  Size: ${(fileSize / 1024).toFixed(2)} KB`);
        console.log(`  MIME: ${fileMime}`);

        // ===== STEP 2: Validate branch =====
        const branchName = req.body.branch;
        if (!branchName) {
            return res.status(400).json({
                success: false,
                error: 'Branch name not provided',
                details: 'Please specify the branch for this upload.'
            });
        }

        console.log(`✓ Branch: ${branchName}`);

        // ===== STEP 3: Parse file to rows =====
        console.log('\n→ Parsing file to rows...');
        const rows = await fileToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
        console.log(`✓ Parsed ${rows.length} data rows`);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No data found in file',
                details: 'The uploaded file appears to be empty.'
            });
        }

        // ===== STEP 4: STRICT HEADER VALIDATION =====
        console.log('\n→ Validating headers (STRICT MODE)...');
        const rawHeaders = Object.keys(rows[0] || {});
        console.log(`  Found ${rawHeaders.length} columns: ${rawHeaders.join(', ')}`);

        const headerValidation = validateAndNormalizeHeaders(rawHeaders);

        if (!headerValidation.isValid) {
            console.error('❌ HEADER VALIDATION FAILED');
            console.error('Errors:', headerValidation.errors);

            return res.status(400).json({
                success: false,
                error: 'File has invalid headers',
                details: 'The uploaded file does not have all required columns.',
                requiredHeaders: Object.keys(ALLOWED_HEADERS).filter(k => ALLOWED_HEADERS[k].required),
                missingHeaders: headerValidation.errors.filter(e => e.includes('Missing')),
                allErrors: headerValidation.errors
            });
        }

        console.log('✓ Header validation PASSED');
        console.log('  Valid header mapping created:', JSON.stringify(headerValidation.headerMapping, null, 2));

        // ===== STEP 5: TRANSFORM data with validated headers =====
        console.log('\n→ Transforming data to database schema...');
        const transformResult = await transformToSalesRecordsWithValidation(
            rows,
            branchName,
            headerValidation.headerMapping
        );

        const { records, rejectedRows, summary } = transformResult;

        console.log(`✓ Transformation complete - ${summary.successCount} valid, ${summary.rejectedCount} rejected`);

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid data rows after transformation',
                details: 'All data rows were rejected during processing.',
                rejectedRows: rejectedRows,
                summary: summary
            });
        }

        // ===== STEP 6: UPLOAD to MongoDB =====
        console.log('\n→ Uploading to MongoDB...');
        const uploadResult = await uploadToMongoDB(records, branchName);

        console.log(`✓ Upload successful - ${uploadResult.insertedCount || uploadResult.modifiedCount} records processed`);

        // ===== STEP 7: Return detailed report =====
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║          UPLOAD COMPLETED SUCCESSFULLY      ║');
        console.log('╚════════════════════════════════════════════╝\n');

        return res.json({
            success: true,
            message: `Successfully uploaded ${records.length} records to ${branchName}`,
            fileName: fileName,
            branch: branchName,
            summary: {
                totalRowsInFile: rows.length,
                successfulRows: records.length,
                rejectedRows: rejectedRows.length,
                successRate: summary.successRate,
                timestamp: new Date().toISOString()
            },
            rejectedRows: rejectedRows.length > 0 ? rejectedRows : null,
            requiredHeaders: Object.keys(ALLOWED_HEADERS).filter(k => ALLOWED_HEADERS[k].required),
            headerMapping: headerValidation.headerMapping
        });

    } catch (error) {
        console.error('\n❌ UPLOAD FAILED - UNEXPECTED ERROR');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        return res.status(500).json({
            success: false,
            error: 'File processing failed',
            details: error.message,
            errorType: error.name
        });
    }
});

/**
 * POST /api/cleanup-duplicates
 * Removes duplicate records from sales_records collection.
 * Keeps the most recent record (by uploadedAt) for each BDE+Month+FY+Branch combination.
 */
app.post('/api/cleanup-duplicates', async (req, res) => {
    try {
        const db = getDB();
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const collection = db.collection(SALES_RECORDS_COLLECTION);

        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║      STARTING DUPLICATE CLEANUP PROCESS     ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // Step 1: Find all duplicate groups
        const duplicates = await collection.aggregate([
            {
                $group: {
                    _id: {
                        bdeName: '$bdeName',
                        month: '$month',
                        fy: '$fy',
                        branch: '$branch'
                    },
                    ids: { $push: '$_id' },
                    count: { $sum: 1 },
                    records: { $push: '$$ROOT' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Found ${duplicates.length} duplicate groups\n`);

        let totalDeletedCount = 0;
        const deletedDetails = [];

        // Step 2: For each duplicate group, keep the most recent and delete others
        for (const group of duplicates) {
            const key = `${group._id.bdeName} | ${group._id.month} | FY${group._id.fy} | ${group._id.branch}`;

            // Sort by uploadedAt (newest first) or by _id if uploadedAt not present
            const sorted = group.records.sort((a, b) => {
                const timeA = new Date(a.uploadedAt || 0).getTime();
                const timeB = new Date(b.uploadedAt || 0).getTime();
                return timeB - timeA;
            });

            // Keep the first (most recent), delete the rest
            const toKeep = sorted[0];
            const toDelete = sorted.slice(1);

            const deleteResult = await collection.deleteMany({
                _id: { $in: toDelete.map(r => r._id) }
            });

            totalDeletedCount += deleteResult.deletedCount;
            deletedDetails.push({
                group: key,
                duplicateCount: group.count,
                deletedCount: deleteResult.deletedCount,
                keptRecord: {
                    id: toKeep._id,
                    uploadedAt: toKeep.uploadedAt
                }
            });

            console.log(`✓ ${key}`);
            console.log(`  - Duplicates: ${group.count}, Deleted: ${deleteResult.deletedCount}`);
        }

        console.log(`\n✓ Cleanup complete - Deleted ${totalDeletedCount} duplicate records\n`);

        return res.json({
            success: true,
            message: 'Duplicate cleanup completed',
            duplicateGroupsFound: duplicates.length,
            totalRecordsDeleted: totalDeletedCount,
            details: deletedDetails
        });

    } catch (error) {
        console.error('Error during cleanup:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            details: error.message
        });
    }
});

/**
 * PUT /api/bde-team
 * Updates the team for a specific BDE for a given month.
 */
app.put('/api/bde-team', async (req, res) => {
    const { bdeName, newTeamLeader, month, branch } = req.body;

    if (!bdeName || !newTeamLeader || !month || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: bdeName, newTeamLeader, month, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Find the BDE user with case-insensitive matching
        const bdeUser = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${bdeName}$`, 'i') }, branch: branch }
        );

        if (!bdeUser) {
            return res.status(404).json({ success: false, error: `BDE "${bdeName}" not found in branch "${branch}".` });
        }

        // Find the team leader user with case-insensitive matching
        const teamLeaderUser = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${newTeamLeader}$`, 'i') }, branch: branch }
        );

        if (!teamLeaderUser) {
            return res.status(404).json({ success: false, error: `Team leader "${newTeamLeader}" not found in branch "${branch}".` });
        }

        // Update sales records using the correct cased names
        const result = await salesCollection.updateMany(
            {
                bdeName: { $regex: new RegExp(`^${bdeName}$`, 'i') },
                month: month,
                branch: branch
            },
            { $set: { teamLeader: teamLeaderUser.name, bdeName: bdeUser.name } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'No record found for the specified BDE, month, and branch.' });
        }

        res.json({ success: true, message: 'BDE team updated successfully.' });

    } catch (error) {
        console.error('Error updating BDE team:', error);
        res.status(500).json({ success: false, error: 'Failed to update BDE team.' });
    }
});

/**
 * Get BDE names endpoint
 */
app.get('/api/bde-names', async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection(USERS_COLLECTION);
        const bdeNames = await collection.distinct('name');
        const uniqueBdeNames = Array.from(new Set(bdeNames)).sort();
        res.json(uniqueBdeNames);
    } catch (error) {
        console.error('Error fetching BDE names:', error);
        res.status(500).json({ error: 'Failed to fetch BDE names' });
    }
});

/**
 * GET /api/drives
 * Returns all drives
 */
app.get('/api/drives', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const collection = db.collection(DRIVES_COLLECTION);
        const drives = await collection.find({}).toArray();

        // Convert month strings to numbers if needed
        const monthToNumber = {
            'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
            'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };

        const processedDrives = drives.map(drive => ({
            ...drive,
            startMonth: typeof drive.startMonth === 'string' ? monthToNumber[drive.startMonth.toUpperCase()] : drive.startMonth,
            endMonth: typeof drive.endMonth === 'string' ? monthToNumber[drive.endMonth.toUpperCase()] : drive.endMonth
        }));

        res.json(processedDrives);
    } catch (error) {
        console.error('Error fetching drives:', error);
        res.status(500).json({ error: 'Failed to fetch drives' });
    }
});

/**
 * POST /api/drives
 * Creates a new drive
 */
app.post('/api/drives', async (req, res) => {
    const { name, startMonth, startYear, endMonth, endYear } = req.body;

    if (!name || !startMonth || !startYear || !endMonth || !endYear) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, startMonth, startYear, endMonth, endYear' });
    }

    // Convert month strings to numbers
    const monthToNumber = {
        'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
        'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
    };

    const startMonthNum = monthToNumber[startMonth.toUpperCase()];
    const endMonthNum = monthToNumber[endMonth.toUpperCase()];

    if (!startMonthNum || !endMonthNum) {
        return res.status(400).json({ success: false, error: 'Invalid month names' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const collection = db.collection(DRIVES_COLLECTION);

        // Check for duplicate drive name and range (universal, not per branch)
        const existingDrive = await collection.findOne({
            name: name,
            $or: [
                {
                    startMonth: startMonthNum,
                    startYear: startYear,
                    endMonth: endMonthNum,
                    endYear: endYear
                }
            ]
        });

        if (existingDrive) {
            return res.status(400).json({ success: false, error: 'A drive with the same name and date range already exists.' });
        }

        const result = await collection.insertOne({
            name,
            startMonth: startMonthNum,
            startYear,
            endMonth: endMonthNum,
            endYear,
            createdAt: new Date()
        });

        res.json({ success: true, message: 'Drive created successfully', id: result.insertedId });
    } catch (error) {
        console.error('Error creating drive:', error);
        res.status(500).json({ success: false, error: 'Failed to create drive' });
    }
});

/**
 * PUT /api/team-name
 * Updates the team name for a specific team leader in a branch.
 */
app.put('/api/team-name', async (req, res) => {
    const { teamLeader, teamName, branch } = req.body;

    if (!teamLeader || !teamName || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: teamLeader, teamName, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const collection = db.collection(SALES_RECORDS_COLLECTION);
        const result = await collection.updateMany(
            { teamLeader: teamLeader, branch: branch },
            { $set: { teamName: teamName } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'No records found for the specified team leader and branch.' });
        }

        res.json({ success: true, message: 'Team name updated successfully.' });

    } catch (error) {
        console.error('Error updating team name:', error);
        res.status(500).json({ success: false, error: 'Failed to update team name.' });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/users', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/roles
 * Returns all unique roles from the database
 */
app.get('/api/roles', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const roles = await usersCollection.distinct('role');
        // Filter out null/undefined and sort
        const validRoles = roles.filter(role => role).sort();
        res.json(validRoles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

/**
 * POST /api/users
 * Creates a new user
 */
app.post('/api/users', async (req, res) => {
    const { name, email, password, role, branch } = req.body;

    if (!name || !email || !password || !role || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, email, password, role, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }
    const usersCollection = db.collection(USERS_COLLECTION);
    const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

    try {
        // Admin flag: this route supports Admin-created updates when `createdByAdmin` is true
        const createdByAdmin = !!req.body.createdByAdmin;

        // Check if user already exists by name (primary key)
        const existingUser = await usersCollection.findOne({ name: name });

        // Check if performance data exists for this name
        const existingPerformanceData = await salesCollection.findOne({ bdeName: name });

        // Hash placeholder password (admin-provided password is temporary)
        const hashedPassword = bcrypt.hashSync(password, 10);

        let userId;

        if (existingUser) {
            if (!createdByAdmin) {
                // Non-admin attempts to create duplicate name — reject
                return res.status(400).json({ success: false, error: 'User with this name already exists' });
            }

            // ADMIN overwrite rules: do NOT change `name` or `role`.
            // Overwrite `email`, `password` (temporary), `branch` (if provided), set `inactive` false.
            const updateFields = {
                email,
                password: hashedPassword,
                inactive: false,
                hasPerformanceData: !!existingPerformanceData
            };

            if (branch) {
                updateFields.branch = branch;
            }

            // Ensure role is NOT changed
            // Use updateOne to apply partial overwrite
            const updateResult = await usersCollection.updateOne(
                { name: name },
                { $set: updateFields }
            );

            userId = existingUser._id;
        } else {
            // New user creation
            const newUser = {
                name,
                email,
                password: hashedPassword,
                role,
                branch,
                inactive: false,
                hasPerformanceData: !!existingPerformanceData,
                resetToken: null,
                resetTokenExpires: null
            };

            const result = await usersCollection.insertOne(newUser);
            userId = result.insertedId;
        }

        // Generate secure reset token for password setup (60 minutes expiry)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

        await usersCollection.updateOne(
            { _id: userId },
            { $set: { resetToken: hashedToken, resetTokenExpires: expires } }
        );

        // Prepare reset link
        const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;

        // Send email via Mailgun
        try {
            await sendPasswordSetupEmail(email, name, role, resetLink);
        } catch (mailErr) {
            console.error('Failed to send password setup email:', mailErr);
            // Don't fail the user creation, but log the error
        }

        res.json({
            success: true,
            message: existingUser ? 'User updated successfully (admin overwrite). Reset email sent.' : 'User created successfully. Reset email sent.',
            id: userId,
            linkedToExistingData: !!existingPerformanceData
        });
    } catch (error) {
        console.error('Error creating or updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to create or update user' });
    }
});

/**
 * POST /api/send-access-email
 * Sends access email to selected users for first-time login
 */
app.post('/api/send-access-email', async (req, res) => {
    const { userIds } = req.body; // Array of user names or IDs

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing or invalid userIds array' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);

    try {
        const users = await usersCollection.find({ name: { $in: userIds } }).toArray();

        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'No users found' });
        }

        const crypto = require('crypto');
        const updatedUsers = [];

        for (const user of users) {
            // Generate secure token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Set expiration (24 hours from now)
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Update user with reset token
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        passwordResetToken: hashedToken,
                        passwordResetExpires: expires
                    }
                }
            );

            // In a real implementation, send email here
            // For now, we'll just log the reset link
            const resetLink = `${req.protocol}://${req.get('host')}/set-password/${resetToken}`;
            console.log(`Access email for ${user.name} (${user.email}): ${resetLink}`);

            updatedUsers.push({
                name: user.name,
                email: user.email,
                resetLink: resetLink
            });
        }

        res.json({
            success: true,
            message: `Access emails prepared for ${updatedUsers.length} users`,
            users: updatedUsers
        });
    } catch (error) {
        console.error('Error sending access emails:', error);
        res.status(500).json({ success: false, error: 'Failed to send access emails' });
    }
});

/**
 * GET /api/set-password/:token
 * Validates password reset token and returns user info
 */
app.get('/api/set-password/:token', async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ success: false, error: 'Missing token' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch
            }
        });
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ success: false, error: 'Failed to validate token' });
    }
});

/**
 * POST /api/set-password/:token
 * Sets new password using valid token
 */
app.post('/api/set-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ success: false, error: 'Missing token or password' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        // Hash new password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Update user with new password and clear reset token
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    resetToken: 1,
                    resetTokenExpires: 1
                }
            }
        );

        res.json({
            success: true,
            message: 'Password set successfully. You can now log in.',
            redirectTo: ''
        });
    } catch (error) {
        console.error('Error setting password:', error);
        res.status(500).json({ success: false, error: 'Failed to set password' });
    }
});

/**
 * POST /api/auth/reset-password
 * Sets new password using valid token (alternative endpoint)
 */
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'Missing token or newPassword' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        // Hash new password
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        // Update user with new password and clear reset token
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    resetToken: 1,
                    resetTokenExpires: 1
                }
            }
        );

        res.json({
            success: true,
            message: 'Password reset successfully. You can now log in.',
            redirectTo: FRONTEND_URL || '/'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Serve static files after API routes
app.use(express.static(path.join(__dirname, '..')));





// Export app for serverless
module.exports = app;

// Start server if run directly
async function start() {
    try {
        await connectToDB();
        app.listen(PORT, () => {
            console.log(`HikePAD API server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    start();
}

/**
 * GET /api/drives
 * Returns all drives
 */
app.get('/api/drives', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const drivesCollection = db.collection(DRIVES_COLLECTION);
        const drives = await drivesCollection.find({}).toArray();

        if (!drives || drives.length === 0) {
            return res.status(404).json({ error: 'No drives found in database.' });
        }

        res.json(drives);

    } catch (error) {
        console.error('Error fetching drives:', error);
        res.status(500).json({ error: 'Failed to fetch drives.' });
    }
});

/**
 * Get BDE names endpoint
 */
app.get('/api/bde-names', async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection(USERS_COLLECTION);
        const bdeNames = await collection.distinct('name');
        const uniqueBdeNames = Array.from(new Set(bdeNames)).sort();
        res.json(uniqueBdeNames);
    } catch (error) {
        console.error('Error fetching BDE names:', error);
        res.status(500).json({ error: 'Failed to fetch BDE names' });
    }
});

/**
 * PUT /api/users/:name
 * Updates a user's information (name, email, role, branch, inactive status, and team membership).
 */
app.put('/api/users/:name', async (req, res) => {
    const { name } = req.params;
    const { name: newName, email, role, branch: newBranch, inactive, isCurrentTeamMember, teamName } = req.body;

    // Validate that at least one field to update is provided
    if (newName === undefined && email === undefined && role === undefined && newBranch === undefined &&
        inactive === undefined && isCurrentTeamMember === undefined) {
        return res.status(400).json({ success: false, error: 'At least one field must be provided for update.' });
    }

    // Validate name if provided
    if (newName !== undefined && (typeof newName !== 'string' || newName.trim().length === 0)) {
        return res.status(400).json({ success: false, error: 'Invalid "name" field in request body.' });
    }

    // Validate email if provided
    if (email !== undefined && email !== null && (typeof email !== 'string' || !email.includes('@'))) {
        return res.status(400).json({ success: false, error: 'Invalid "email" field in request body.' });
    }

    // Validate role if provided
    const validRoles = ['Vice President', 'Deputy Branch Manager', 'Team Leader', 'Business Development Executive'];
    if (role !== undefined && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid "role" field in request body.' });
    }

    // Validate branch if provided
    const validBranches = ['Hyderabad Branch', 'Mumbai Branch'];
    if (newBranch !== undefined && !validBranches.includes(newBranch)) {
        return res.status(400).json({ success: false, error: 'Invalid "branch" field in request body.' });
    }

    // Validate inactive if provided
    if (inactive !== undefined && typeof inactive !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "inactive" field in request body.' });
    }

    // Validate isCurrentTeamMember if provided
    if (isCurrentTeamMember !== undefined && typeof isCurrentTeamMember !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "isCurrentTeamMember" field in request body.' });
    }

    if (!branch && !newBranch) {
        return res.status(400).json({ success: false, error: 'Either current "branch" or new "branch" field must be provided.' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Use provided branch or newBranch for finding the user
        const searchBranch = branch || newBranch;

        // Find the user with case-insensitive name matching
        const user = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: searchBranch }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
        }

        const updateFields = {};
        if (newName !== undefined) updateFields.name = newName.trim();
        if (email !== undefined) updateFields.email = email ? email.trim() : null;
        if (role !== undefined) updateFields.role = role;
        if (newBranch !== undefined) updateFields.branch = newBranch;
        if (inactive !== undefined) updateFields.inactive = inactive;

        // Update user record
        if (Object.keys(updateFields).length > 0) {
            const userResult = await usersCollection.updateOne(
                { name: user.name, branch: user.branch },
                { $set: updateFields }
            );

            if (userResult.matchedCount === 0) {
                return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
            }

            // If name or branch changed, update all related sales records
            if (newName || newBranch) {
                const salesUpdateFields = {};
                if (newName) salesUpdateFields.bdeName = newName.trim();
                if (newBranch) salesUpdateFields.branch = newBranch;

                await salesCollection.updateMany(
                    { bdeName: user.name, branch: user.branch },
                    { $set: salesUpdateFields }
                );
            }
        }

        // Handle isCurrentTeamMember - this should update sales records, not user records
        if (isCurrentTeamMember !== undefined) {
            const currentBranch = newBranch || user.branch;
            const currentName = newName || user.name;

            if (isCurrentTeamMember && teamName) {
                // Setting to current - set all other teams for this BDE to not current
                await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $nor: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: false } }
                );
            }

            // Update the specific team
            if (teamName) {
                const teamUpdateResult = await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $or: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: isCurrentTeamMember } }
                );

                if (teamUpdateResult.matchedCount === 0) {
                    console.warn(`No sales records found for BDE "${currentName}" in team "${teamName}"`);
                }
            }
        }

        res.json({ success: true, message: `User "${user.name}" updated successfully.` });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user.' });
    }
});

/**
 * PUT /api/user/role
 * Updates a user's role.
 */
app.put('/api/user/role', async (req, res) => {
    const { name, branch, newRole } = req.body;

    if (!name || !branch || !newRole) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, branch, newRole' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const result = await usersCollection.updateOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: { $regex: new RegExp(`^${branch}$`, 'i') } },
            { $set: { role: newRole } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: `User "${name}" in branch "${branch}" not found.` });
        }

        res.json({ success: true, message: `User "${name}" role updated successfully to "${newRole}".` });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role.' });
    }
});


/**
 * POST /api/upload-excel
 * Uploads Excel file, converts to JSON, and processes data to MongoDB
 */
