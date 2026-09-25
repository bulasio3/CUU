-- 1. Create the Audit Logs table to track changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    action_performed VARCHAR(50) NOT NULL,
    old_balance DECIMAL(10, 2),
    new_balance DECIMAL(10, 2),
    changed_by VARCHAR(50) DEFAULT 'SYSTEM',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 2. Drop the trigger if it already exists to prevent errors
DROP TRIGGER IF EXISTS after_student_fees_update;

-- 3. Create the trigger to catch any changes to the fees balance
DELIMITER $$

CREATE TRIGGER after_student_fees_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
    -- Only log if the fees_balance actually changed
    IF OLD.fees_balance <> NEW.fees_balance THEN
        INSERT INTO audit_logs (
            student_id, 
            action_performed, 
            old_balance, 
            new_balance, 
            changed_by
        )
        VALUES (
            NEW.id, 
            'FEES_BALANCE_UPDATE', 
            OLD.fees_balance, 
            NEW.fees_balance, 
            'ADMIN'
        );
    END IF;
END$$

DELIMITER ;
