import bcrypt from 'bcryptjs';
import pool from './db.js';

/**
 * Utility script to update or seed developer credentials
 * Usage:
 *   node update-dev.js [optional_password]
 * Example:
 *   node update-dev.js Developer@123
 */
export async function updateDeveloperCredentials(email = 'developer@gmail.com', password = 'Developer@123') {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (emp_id, full_name, email, password, department, role, status)
       VALUES ('EMP-006', 'Developer', $1, $2, 'Development', 'Developer', 'Active')
       ON CONFLICT (email) DO UPDATE
       SET password = $2, role = 'Developer', status = 'Active'
       RETURNING id, emp_id, full_name, email, role, status;`,
      [email.toLowerCase().trim(), hash]
    );

    console.log('✓ Developer credentials successfully updated in database:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    return result.rows[0];
  } catch (error) {
    console.error('✗ Failed to update developer credentials:', error);
    throw error;
  }
}

// Run directly from CLI
if (process.argv[1]?.replace(/\\/g, '/').endsWith('ticket-backend/update-dev.js') || process.argv[1]?.endsWith('update-dev.js')) {
  const customPassword = process.argv[2] || 'Developer@123';
  updateDeveloperCredentials('developer@gmail.com', customPassword)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
