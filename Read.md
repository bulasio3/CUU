# CUU System Backend API Engine

Node.js & Express API serving system rules, role profiles, and real-time gate protection checks.

## Production Initialization Steps

1. Configure environment flags inside a custom `.env` string file:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=cuu_records_db
   JWT_SECRET=cuu_secret_key_98765
   ```
2. Initialize Node framework dependencies:
   ```bash
   npm install
   ```
3. Run the development execution script:
   ```bash
   npm run start
   ```