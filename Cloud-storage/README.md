# LOOKOUT Cloud Storage Layer

## Setup
1. Run `npm install` in this folder
2. Create a `.env` file (not included — ignored by git) with:

B2_ENDPOINT=https://s3.<region>.backblazeb2.com
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lookout

LOCAL_STORAGE_ROOT=/path/to/local/test/storage
STORAGE_PROVIDER_NAME=B2

3. Run `lookout_schema_v1.sql` on a fresh MySQL database to create all tables
4. Test with `node test.js` (requires a `test-image.png` in this folder — already included)

## What's here
- `uploadPipeline.js` / `deletePipeline.js` / `downloadPipeline.js` — the three core functions a backend would call
- `cleanupJob.js` — run manually for now (`node cleanupJob.js`); permanently removes files past their 7-day soft-delete grace period
- `demo*.js` — scripts for creating/removing demo users with smaller storage quotas, useful for presentations