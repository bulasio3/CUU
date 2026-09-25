const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const path = require('path');


const path = require('path');

// Explicitly join the directory structure to point up one level out of backend and into frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});


const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'CUU_SUPER_SECRET_TOKEN_KEY_2026';

// Connect to MongoDB Atlas or Local MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cuu_system')
    .then(() => console.log('MongoDB Engine Active & Connected Successfully'))
    .catch(err => console.error('Database connection error:', err));

// --- DATA SCHEMAS & DATABASE TRIGGERS ---

// 1. Audit Logs Schema
const AuditLogSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    action_performed: String,
    old_balance: Number,
    new_balance: Number,
    changed_by: { type: String, default: 'ADMIN' },
    changed_at: { type: Date, default: Date.now }
});
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// 2. Student Schema
const StudentSchema = new mongoose.Schema({
    name: String,
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Plain text for prototype simplicity
    role: { type: String, default: 'student' },
    fees_balance: { type: Number, default: 0 },
    gpa: { type: Number, default: 0.0 },
    grades: [{
        course_code: String,
        marks: Number,
        grade_letter: String
    }]
});

// AUTOMATED SYSTEM TRIGGER: Logs fee changes before saving
StudentSchema.pre('save', async function (next) {
    if (this.isModified('fees_balance')) {
        // Find original values if document already exists
        const original = await this.constructor.findById(this._id);
        const oldBal = original ? original.fees_balance : 0;
        
        await AuditLog.create({
            student_id: this._id,
            action_performed: 'FEES_BALANCE_UPDATE',
            old_balance: oldBal,
            new_balance: this.fees_balance
        });
    }
    next();
});

const Student = mongoose.model('Student', StudentSchema);

// --- SEED SEED DATA TO MOCK DATABASE ON STARTUP ---
async function seedDatabase() {
    const count = await Student.countDocuments();
    if (count === 0) {
        await Student.create({
            name: 'Bulasio Student',
            username: 'student1',
            password: 'password123',
            role: 'student',
            fees_balance: 450000.00, // Owes money initially
            gpa: 3.85,
            grades: [
                { course_code: 'BIT 1101', marks: 82, grade_letter: 'A' },
                { course_code: 'BIT 1102', marks: 55, grade_letter: 'C' }
            ]
        });
        console.log('Database seeded with fallback student profile records.');
    }
}
seedDatabase();

// --- ENDPOINT API PATH ROUTES ---

// 1. Authentication Login Portal Gateway
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await Student.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid username credentials or password' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user._id, username: user.username, name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Internal system auth routing error' });
    }
});

// 2. Student Dashboard Endpoint (Enforces Financial Gate Logic)
app.get('/api/student/dashboard', async (req, res) => {
    // Basic auth interceptor simplification for testing
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing Authentication Token' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const student = await Student.findById(decoded.id);
        if (!student) return res.status(404).json({ error: 'Profile data mismatch' });

        const financialGateLocked = student.fees_balance > 0;

        // Execute Financial Gate structural restriction logic
        const evaluatedGrades = student.grades.map(record => ({
            course_code: record.course_code,
            marks: financialGateLocked ? 'WITHHELD' : record.marks,
            grade_letter: financialGateLocked ? 'W' : record.grade_letter
        }));

        res.json({
            student: {
                id: student._id,
                name: student.name,
                fees_balance: student.fees_balance,
                gpa: financialGateLocked ? '0.00' : student.gpa
            },
            financial_gate_locked: financialGateLocked,
            grades: evaluatedGrades
        });
    } catch (error) {
        res.status(401).json({ error: 'Session Forbidden: Invalid Token Signature' });
    }
});

app.listen(PORT, () => console.log(`Server running actively on port ${PORT}`));

