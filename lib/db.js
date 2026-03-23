// Database initialization and helpers using better-sqlite3
// In production, use PostgreSQL or a managed database service.

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'backend', 'clinic.db');

let db;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    migrateTables();
    seedIfEmpty();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      age INTEGER,
      address TEXT DEFAULT '',
      medical_history TEXT DEFAULT '',
      is_deleted INTEGER DEFAULT 0,
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      type TEXT DEFAULT 'checkup',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS treatments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      appointment_id TEXT,
      description TEXT NOT NULL,
      cost REAL DEFAULT 0,
      treatment_fee REAL DEFAULT 0,
      surgery_fee REAL DEFAULT 0,
      consultation_fee REAL DEFAULT 0,
      date TEXT NOT NULL,
      dentist TEXT DEFAULT '',
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      medications TEXT NOT NULL,
      diagnosis TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      pdf_url TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      surgeon_fee REAL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      patient_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      channel TEXT DEFAULT 'whatsapp',
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      clinic_name TEXT DEFAULT 'Victoria Dental Care',
      tagline TEXT DEFAULT 'Premium Dental Solutions',
      logo_url TEXT DEFAULT '',
      accent_color TEXT DEFAULT '#007aff',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      whatsapp_enabled INTEGER DEFAULT 1,
      whatsapp_number TEXT DEFAULT '',
      reminder_template TEXT DEFAULT 'Hello M/s [Name], \nYour Dental Appointment has been Scheduled on 🗓 [Date] at ⏰ [Time]. For enquiry please contact below number. Thanks. \n\nDon''t forget to bring: \n1. Prescriptions given by our clinic. \n2. X-RAYS taken (if any). \n3. Your Regular Medicines (if any). \n\nவணக்கம் [Name] , உங்கள் பல் மருத்துவ சிகிச்சைக்கான முன்பதிவு நேரம் 🗓 [Date] அன்று ⏰ [Time] மணிக்கு நியமிக்கபட்டுள்ளது. மேலும் விவரங்களுக்கு கீழ்கண்ட எண்ணிற்கு அழைக்கவும். நன்றி. \n\nVictoria Dental Care\nDr.S.Ezhil Ethel Selvam\n9789124194'
    );
    
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      subtext TEXT DEFAULT '',
      color TEXT DEFAULT '',
      patient_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);
}

function migrateTables() {
  const tableInfo = db.prepare("PRAGMA table_info(treatments)").all();
  const columns = tableInfo.map(c => c.name);
  
  if (!columns.includes('treatment_fee')) {
    db.exec('ALTER TABLE treatments ADD COLUMN treatment_fee REAL DEFAULT 0');
  }
  if (!columns.includes('surgery_fee')) {
    db.exec('ALTER TABLE treatments ADD COLUMN surgery_fee REAL DEFAULT 0');
  }
  if (!columns.includes('consultation_fee')) {
    db.exec('ALTER TABLE treatments ADD COLUMN consultation_fee REAL DEFAULT 0');
  }

  // Migrate patients table
  const patientCols = db.prepare("PRAGMA table_info(patients)").all().map(c => c.name);
  if (!patientCols.includes('address')) {
    db.exec('ALTER TABLE patients ADD COLUMN address TEXT DEFAULT \"\"');
  }

  // Migrate prescriptions table
  const rxCols = db.prepare("PRAGMA table_info(prescriptions)").all().map(c => c.name);
  if (!rxCols.includes('surgeon_fee')) {
    db.exec('ALTER TABLE prescriptions ADD COLUMN surgeon_fee REAL DEFAULT 0');
  }
}

import { hashPassword } from './auth';

function seedIfEmpty() {
  const patientCount = db.prepare('SELECT COUNT(*) as cnt FROM patients').get();
  // We want to "complete fully", so if it's almost empty, we'll populate more.
  if (patientCount.cnt <= 1) {
    // Clear potentially messy partial data
    db.exec('DELETE FROM activity_log');
    db.exec('DELETE FROM notifications');
    db.exec('DELETE FROM treatments');
    db.exec('DELETE FROM appointments');
    db.exec('DELETE FROM patients');

    const insertPatient = db.prepare('INSERT INTO patients (id, name, phone, email, age, medical_history, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const patientsData = [
      ['p1', 'Sarah Johnson', '+1 (555) 234-5678', 'sarah.j@email.com', 34, 'No known allergies', 'SJ'],
      ['p2', 'Michael Chen', '+1 (555) 345-6789', 'mchen@email.com', 28, 'Penicillin allergy', 'MC'],
      ['p3', 'Emily Rodriguez', '+1 (555) 456-7890', 'emily.r@email.com', 45, 'Type 2 Diabetes', 'ER'],
      ['p4', 'James Wilson', '+1 (555) 567-8901', 'jwilson@email.com', 52, 'Hypertension', 'JW'],
      ['p5', 'Priya Patel', '+1 (555) 678-9012', 'priya.p@email.com', 31, 'None', 'PP'],
      ['p6', 'David Kim', '+1 (555) 789-0123', 'dkim@email.com', 39, 'Latex allergy', 'DK'],
      ['p7', 'Ana Martinez', '+1 (555) 890-1234', 'ana.m@email.com', 26, 'None', 'AM'],
      ['p8', 'Robert Taylor', '+1 (555) 901-2345', 'rtaylor@email.com', 61, 'Blood thinners', 'RT'],
    ];
    patientsData.forEach(p => insertPatient.run(...p));

    const insertAppt = db.prepare('INSERT INTO appointments (id, patient_id, patient_name, date, time, duration, type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];
    
    const apptsData = [
      ['a1', 'p1', 'Sarah Johnson', today, '09:00', 30, 'checkup', 'checkin', 'Regular checkup'],
      ['a2', 'p3', 'Emily Rodriguez', today, '09:45', 60, 'treatment', 'engaged', 'Root canal procedure'],
      ['a3', 'p5', 'Priya Patel', today, '11:00', 30, 'cleaning', 'confirmed', 'Routine scaling'],
      ['a4', 'p2', 'Michael Chen', today, '14:00', 45, 'consultation', 'confirmed', 'Ortho assessment'],
      ['a5', 'p7', 'Ana Martinez', today, '15:30', 30, 'checkup', 'pending', 'Follow-up on gum health'],
      ['a6', 'p4', 'James Wilson', tomorrow, '10:00', 90, 'surgery', 'confirmed', 'Wisdom tooth extraction'],
      ['a7', 'p6', 'David Kim', tomorrow, '13:00', 30, 'cleaning', 'pending', 'Deep cleaning session'],
      ['a8', 'p8', 'Robert Taylor', dayAfter, '09:30', 60, 'treatment', 'confirmed', 'Crown fitting'],
    ];
    apptsData.forEach(a => insertAppt.run(...a));

    const insertTreatment = db.prepare('INSERT INTO treatments (id, patient_id, description, cost, treatment_fee, surgery_fee, consultation_fee, date, dentist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const treatData = [
      ['t1', 'p1', 'Cavity filling - lower right molar', 280, 200, 0, 80, '2025-09-15', 'Dr. Anand'],
      ['t2', 'p1', 'Professional cleaning & polishing', 150, 150, 0, 0, '2026-01-10', 'Dr. Anand'],
      ['t3', 'p3', 'Root canal treatment - upper left', 850, 600, 200, 50, '2025-11-20', 'Dr. Anand'],
      ['t4', 'p2', 'Dental X-rays & consultation', 120, 0, 0, 120, '2025-10-05', 'Dr. Anand'],
      ['t5', 'p4', 'Crown preparation', 650, 500, 0, 150, '2025-12-12', 'Dr. Anand'],
      ['t6', 'p6', 'Teeth whitening session', 350, 350, 0, 0, '2026-02-01', 'Dr. Anand'],
    ];
    treatData.forEach(t => insertTreatment.run(...t));

    // Sample Prescriptions
    const insertRx = db.prepare('INSERT INTO prescriptions (id, patient_id, medications, diagnosis, notes, total_amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const rxData = [
      ['rx1', 'p1', JSON.stringify([{name: 'Amoxicillin 500mg', price: 45}, {name: 'Paracetamol 500mg', price: 20}]), 'General Infection', 'Take after food twice daily', 65, '2026-01-10'],
      ['rx2', 'p3', JSON.stringify([{name: 'Ibuprofen 400mg', price: 30}, {name: 'Metronidazole', price: 55}]), 'Root Canal Pain', 'Avoid cold drinks', 85, '2025-11-20'],
    ];
    rxData.forEach(rx => insertRx.run(...rx));
  }

  const staffCount = db.prepare('SELECT COUNT(*) as cnt FROM staff').get();
  if (staffCount.cnt === 0) {
    const adminHash = hashPassword('admin123');
    db.prepare('INSERT INTO staff (id, name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'admin-default', 'Administrator', 'admin', 'admin@victoriadental.com', adminHash, 'admin'
    );
    const anandHash = hashPassword('admin');
    db.prepare('INSERT INTO staff (id, name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'admin-1', 'Dr. Anand', 'Anand', 'victoriadentalcare2015@gmail.com', anandHash, 'admin'
    );
    const staffHash = hashPassword('staff');
    db.prepare('INSERT INTO staff (id, name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'staff-1', 'Test Staff', 'staff', 'staff@email.com', staffHash, 'staff'
    );
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM settings').get();
  if (settingsCount.cnt === 0) {
    db.prepare('INSERT INTO settings (id, clinic_name, tagline, phone, email, address, whatsapp_number) VALUES (1, ?, ?, ?, ?, ?, ?)').run(
      'Victoria Dental Care', 'Premium Dental Solutions', '+91 9176733358', 'victoriadentalcare2015@gmail.com', 'No 1/334 Injambakkam, Opp to Suga Jeeva Peralayam, Ammathi, Perumal Koil St, Chennai, Tamil Nadu 600115', '+91 9176733358'
    );
  }

  // Seed Notifications if empty
  const notifCount = db.prepare('SELECT COUNT(*) as cnt FROM notifications').get();
  if (notifCount.cnt === 0) {
    const insertNotif = db.prepare('INSERT INTO notifications (id, type, title, message, patient_id, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const notifsData = [
      ['n1', 'missed', 'Missed Appointment', 'Ana Martinez missed her appointment recently', 'p7', 0, '2026-03-19 07:00:00'],
      ['n2', 'upcoming', 'Upcoming Appointment', 'James Wilson has surgery scheduled for tomorrow', 'p4', 0, '2026-03-18 06:00:00'],
      ['n3', 'reminder', 'Reminder Sent', 'WhatsApp reminder sent to Priya Patel', 'p5', 0, '2026-03-19 08:30:00']
    ];
    notifsData.forEach(n => insertNotif.run(...n));
  }

  // Seed Activity Log if empty
  const activityCount = db.prepare('SELECT COUNT(*) as cnt FROM activity_log').get();
  if (activityCount.cnt === 0) {
    const insertActivity = db.prepare('INSERT INTO activity_log (id, text, subtext, color, patient_id) VALUES (?, ?, ?, ?, ?)');
    const activityData = [
      ['a1', 'Sarah Johnson checked in', 'Regular checkup', 'blue', 'p1'],
      ['a2', 'Reminder sent to Emily Rodriguez', 'Via WhatsApp', 'green', 'p3'],
      ['a3', 'Emily Rodriguez arrived', 'Root canal treatment', 'orange', 'p3'],
      ['a4', 'Sarah Johnson completed visit', 'Paid ₹150', 'green', 'p1']
    ];
    activityData.forEach(a => insertActivity.run(...a));
  }
}
