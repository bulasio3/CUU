const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// A mock version of your server's logic to test endpoints independently
const app = express();
app.use(express.json());

const JWT_SECRET = 'test_secret_key_123';

// Mock database state
let mockStudent = { id: 1, name: 'John Doe', fees_balance: 500000.00 };
let mockGrades = [
  { course_code: 'BIT 1101', marks: 85, grade_letter: 'A' },
  { course_code: 'BIT 1102', marks: 45, grade_letter: 'D' }
];

// Mock Student Dashboard Endpoint with Financial Gate Logic
app.get('/api/student/dashboard', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Enforce Financial Gate Logic
    const isLocked = mockStudent.fees_balance > 0;
    const finalGrades = mockGrades.map(grade => ({
      course_code: grade.course_code,
      // If student owes money, blur or withhold their marks
      marks: isLocked ? 'WITHHELD' : grade.marks,
      grade_letter: isLocked ? 'W' : grade.grade_letter
    }));

    res.json({
      student: mockStudent,
      financial_gate_locked: isLocked,
      grades: finalGrades
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
});

// --- JEST TEST SUITE ---
describe('CUU System Backend - Financial Gate & Auth Tests', () => {
  let validToken;

  beforeAll(() => {
    // Generate a test token before running tests
    validToken = jwt.sign({ id: 1, role: 'student' }, JWT_SECRET);
  });

  it('should block access if no token is provided', async () => {
    const res = await request(app).get('/api/student/dashboard');
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should allow access and withhold grades if fees_balance > 0', async () => {
    mockStudent.fees_balance = 500000.00; // Student owes money

    const res = await request(app)
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.financial_gate_locked).toBe(true);
    expect(res.body.grades[0].marks).toBe('WITHHELD');
  });

  it('should show actual grades if fees_balance is 0', async () => {
    mockStudent.fees_balance = 0.00; // Student is cleared

    const res = await request(app)
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.financial_gate_locked).toBe(false);
    expect(res.body.grades[0].marks).toBe(85); // Actual marks visible
  });
});
