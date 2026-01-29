# TODO: Fix User Data Erasure Issues

## Information Gathered
- **Destructive Upload Logic**: `uploadToMongoDB` in `server.js` deletes all sales records for a branch on upload and upserts users, overwriting manual changes.
- **Migration Script**: `migrate()` in `migration.js` deletes all users and recreates from hardcoded data.
- **User Upsert Overwrites**: User upsert in `uploadToMongoDB` always sets role/inactive, ignoring manual updates.
- **Startup Migration**: `migrate()` is commented out but could wipe users if enabled.

## Plan
- [ ] Modify `uploadToMongoDB` in `backend/server.js` to update/insert sales records without deleting all existing data.
- [ ] Change user upsert logic to preserve existing manual changes (role, inactive) unless the user is new.
- [ ] Update `migrate()` in `backend/migration.js` to be one-time by checking if migration has already run.
- [ ] Ensure `setup_users.js` doesn't overwrite existing user data unnecessarily.

## Dependent Files to be edited
- `backend/server.js`: Modify upload logic and user upsert.
- `backend/migration.js`: Make migration one-time.

## Followup steps
- [ ] Test upload functionality to ensure data is not erased.
- [ ] Verify user data persistence after uploads.
- [ ] Run migration script safely.
- [ ] Manual testing of user management features.
