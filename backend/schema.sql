-- Database Schema for CUU Student Records Management System
CREATE DATABASE IF NOT EXISTS cuu_records_db;
USE cuu_records_db;

-- Users Table (Handles all 3 roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Profile Table
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    program VARCHAR(100) NOT NULL,
    current_gpa DECIMAL(3,2) DEFAULT 0.00,
    fees_balance DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    credit_units INT NOT NULL
);

-- Enrollments & Grades Table (With Financial Gate Evaluation context)
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    marks DECIMAL(5,2) DEFAULT NULL,
    grade VARCHAR(2) DEFAULT NULL,
    gpa_points DECIMAL(3,2) DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

-- Retake Applications Table
CREATE TABLE IF NOT EXISTS retakes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

-- Insert Mock Data
INSERT INTO users (id, username, email, password_hash, role) VALUES 
(1, 'std_brian', 'brian@cavendish.ac.ug', '$2a$10$765432109876543210987uV9xM8xK2xP3xQ4xR5xS6xT7xU8xV9xW', 'student'),
(2, 'lec_jane', 'jane@cavendish.ac.ug', '$2a$10$765432109876543210987uV9xM8xK2xP3xQ4xR5xS6xT7xU8xV9xW', 'lecturer'),
(3, 'admin_clara', 'clara@admin.cavendish.ac.ug', '$2a$10$765432109876543210987uV9xM8xK2xP3xQ4xR5xS6xT7xU8xV9xW', 'admin');

INSERT INTO students (student_id, user_id, full_name, program, current_gpa, fees_balance) VALUES 
('CUU-2024-0042', 1, 'Brian Okello', 'Bachelor of Science in Computer Science', 4.25, 0.00);

INSERT INTO courses (course_code, course_name, credit_units) VALUES 
('CS101', 'Introduction to Software Engineering', 4),
('CS102', 'Database Management Systems', 4),
('CS103', 'Web Development Frameworks', 3);

INSERT INTO enrollments (student_id, course_code, semester, marks, grade, gpa_points) VALUES 
('CUU-2024-0042', 'CS101', 'Jan-May 2026', 82.5, 'A', 5.0),
('CUU-2024-0042', 'CS102', 'Jan-May 2026', 74.0, 'B+', 4.5),
('CUU-2024-0042', 'CS103', 'Jan-May 2026', 68.0, 'B', 4.0);
