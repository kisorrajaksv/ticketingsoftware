import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const targetUrl = (process.argv[2] || process.env.DATABASE_URL || '').trim();
if (!targetUrl) {
  console.error('❌ No DATABASE_URL provided. Pass it as an argument or set DATABASE_URL in environment / .env');
  process.exit(1);
}

const isCloudDb = !targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000
});

export async function resetProductionDatabase() {
  console.log('\n======================================================');
  console.log('🚀 INITIALIZING CLEAN PRODUCTION DATABASE RESET');
  console.log(`🎯 Target: ${isCloudDb ? 'Cloud / Live PostgreSQL (SSL)' : 'Local PostgreSQL'}`);
  console.log('======================================================\n');

  try {
    // 1. Dynamically discover and truncate all application data tables (preserving schema)
    console.log('1. Clearing all projects, tickets, sheets, reset codes, notifications, and logs...');
    const tablesToClear = [
      'password_reset_codes',
      'ticket_history',
      'notifications',
      'project_documents',
      'project_sheets',
      'project_developer_assignments',
      'project_lead_assignments',
      'tickets',
      'projects',
      'approvals',
      'deployments'
    ];

    const existingTablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const existingSet = new Set(existingTablesRes.rows.map((r) => r.table_name));
    const presentTables = tablesToClear.filter((t) => existingSet.has(t));

    if (presentTables.length > 0) {
      await pool.query(`TRUNCATE TABLE ${presentTables.join(', ')} RESTART IDENTITY CASCADE;`);
    }
    console.log(`   ✓ Cleared ${presentTables.length} tables.`);

    // 2. Clean users table: remove all existing users (including old manager@gmail.com / qalead@gmail.com)
    console.log('2. Resetting users table to clean production baseline...');
    if (existingSet.has('users')) {
      await pool.query(`TRUNCATE TABLE users RESTART IDENTITY CASCADE;`);
    }

    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);

    await pool.query(`
      INSERT INTO users (emp_id, full_name, email, password, department, role, phone, status)
      VALUES 
        ('EMP-000', 'System Admin', 'admin@gmail.com', $1, 'Management', 'Admin', '+91 9876543210', 'Active')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        phone = '+91 9876543210',
        status = 'Active';
    `, [adminPasswordHash]);
    console.log('   ✓ Clean system account seeded (System Admin: admin@gmail.com, Password: Admin@123).');

    // 3. Ensure official roles are seeded
    console.log('3. Seeding standard production roles...');
    await pool.query(`
      INSERT INTO roles (role_name, description, permissions) VALUES
        ('Admin', 'Complete company administration, employee management, and system governance', 
         ARRAY['manage_users', 'manage_projects', 'manage_roles', 'view_reports', 'manage_tickets', 'approve_deployments']),
        ('Manager', 'Complete workspace administration, team management, project governance, and system security controls', 
         ARRAY['manage_users', 'manage_projects', 'manage_roles', 'view_reports', 'manage_tickets', 'approve_deployments']),
        ('QA Lead', 'Oversees test strategies, test runs, sprint ticket approvals, and production release sign-offs', 
         ARRAY['manage_tickets', 'view_reports', 'manage_projects', 'approve_deployments']),
        ('QA Member', 'Executes manual and automated test cases, logs bug reports, and verifies defect fixes', 
         ARRAY['manage_tickets', 'view_reports']),
        ('Developer', 'Investigates assigned defect tickets, develops code fixes, and submits fixes for QA verification', 
         ARRAY['manage_tickets']),
        ('Project Lead', 'Directs roadmap execution, sprint velocity, cross-department ticket triage, and delivery milestones', 
         ARRAY['manage_projects', 'manage_tickets', 'view_reports'])
      ON CONFLICT (role_name) DO UPDATE SET
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions;
    `);
    console.log('   ✓ Production roles verified.');

    // 4. Clean uploads/tickets folder of test files
    const uploadsDir = path.join(__dirname, 'uploads', 'tickets');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
          } catch (e) {}
        }
      }
      console.log('4. Cleared test screenshot uploads from disk.');
    }

    console.log('\n======================================================');
    console.log('✅ PRODUCTION DATABASE IS PRISTINE, EMPTY & READY FOR LIVE USE!');
    console.log('   - 0 Projects');
    console.log('   - 0 Tickets');
    console.log('   - 0 Test Case Sheets');
    console.log('   - 0 Dummy Assignments');
    console.log('   - Default System Admin: admin@gmail.com (Password: Admin@123)');
    console.log('======================================================\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting production database:', error);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

resetProductionDatabase();

