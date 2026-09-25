const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cuu_secret_key_98765';

// Database Pool Connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cuu_records_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Middleware: Verify Token & Dynamic Access Restrictions ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// Role Access Restriction Check
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden: unauthorized role privilege' });
        }
        next();
    };
};

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ error: 'User registration records not found' });
        
        const user = users[0];
        // For development/mock verification convenience, a fallback plain text match or bcrypt match can bypass
        const validPassword = password === 'password123' || await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid security credentials provided' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STUDENT DISCOVERY & FINANCIAL GATE RUNTIME ---
app.get('/api/student/dashboard', authenticateToken, authorizeRoles('student'), async (req, res) => {
    try {
        // Retrieve explicit Profile details
        const [studentProfile] = await db.execute('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
        if (studentProfile.length === 0) return res.status(404).json({ error: 'Student registration profile missing' });
        
        const student = studentProfile[0];
        const financialGateBlocked = student.fees_balance > 0.00;

        // Fetch course records
        const [enrollments] = await db.execute(
            `SELECT e.course_code, c.course_name, c.credit_units, e.semester, 
             e.marks, e.grade, e.gpa_points 
             FROM enrollments e 
             JOIN courses c ON e.course_code = c.course_code 
             WHERE e.student_id = ?`, [student.student_id]
        );

        // Run dynamic protection criteria matching the frontend behavior
        if (financialGateBlocked) {
            const secureEnrollments = enrollments.map(e => ({
                course_code: e.course_code,
                course_name: e.course_name,
                credit_units: e.credit_units,
                semester: e.semester,
                marks: "WITHHELD", // Financial gate active obfuscation
                grade: "W",
                gpa_points: "0.0"
            }));
            return res.json({
                profile: student,
                financialGateStatus: { cleared: false, outstandingBalance: student.fees_balance },
                examPermit: "WITHHELD - CLEAR FEE BALANCE",
                academicRecords: secureEnrollments
            });
        }

        res.json({
            profile: student,
            financialGateStatus: { cleared: true, outstandingBalance: 0.00 },
            examPermit: "GRANTED - ELIGIBLE FOR EXAMINATIONS",
            academicRecords: enrollments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LECTURER ACADEMIC GRADING INTERFACE ---
app.post('/api/lecturer/grade', authenticateToken, authorizeRoles('lecturer'), async (req, res) => {
    const { student_id, course_code, semester, marks } = req.body;
    
    // Scale conversion tool mapping to dynamic CUU 5.0 system
    let grade = 'F';
    let gpa_points = 0.0;
    if (marks >= 80) { grade = 'A'; gpa_points = 5.0; }
    else if (marks >= 75) { grade = 'B+'; gpa_points = 4.5; }
    else if (marks >= 70) { grade = 'B'; gpa_points = 4.0; }
    else if (marks >= 65) { grade = 'C+'; gpa_points = 3.5; }
    else if (marks >= 60) { grade = 'C'; gpa_points = 3.0; }
    else if (marks >= 50) { grade = 'D'; gpa_points = 2.0; }

    try {
        await db.execute(
            `UPDATE enrollments 
             SET marks = ?, grade = ?, gpa_points = ? 
             WHERE student_id = ? AND course_code = ? AND semester = ?`,
            [marks, grade, gpa_points, student_id, course_code, semester]
        );
        res.json({ message: 'Academic marks ledger updated successfully.', grade, gpa_points });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN CONTROL: ALTER FEES (FINANCIAL GATE TRIGGER) ---
app.put('/api/admin/update-fees', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { student_id, fees_balance } = req.body;
    try {
        await db.execute('UPDATE students SET fees_balance = ? WHERE student_id = ?', [fees_balance, student_id]);
        res.json({ message: `Financial ledger adjusted successfully for ${student_id}. Current fee balance set to: UGX ${fees_balance}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`CUU Backend System running securely on port ${PORT}`));
