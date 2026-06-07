import { createClient } from "@supabase/supabase-js";

let supabase;

// ═══════════════════════════════════════════
// SUPABASE CLIENT MOCK FOR LOCAL VERIFICATION
// ═══════════════════════════════════════════

class MockQueryBuilder {
  constructor(table, method = 'select', args = null) {
    this.table = table;
    this.method = method;
    this.args = args;
    this._eqFilters = {};
  }
  
  select(cols) { return this; }
  eq(col, val) { 
    this._eqFilters[col] = val; 
    return this; 
  }
  neq(col, val) { return this; }
  order(col, opt) { return this; }
  limit(n) { return this; }
  
  async single() {
    const data = this._getData(true);
    return { data, error: null };
  }
  
  insert(data) {
    this.method = 'insert';
    this.args = data;
    return this;
  }
  
  update(data) {
    this.method = 'update';
    this.args = data;
    return this;
  }
  
  delete() {
    this.method = 'delete';
    return this;
  }

  _getData(isSingle = false) {
    const table = this.table;
    const eq = this._eqFilters;

    if (table === 'staff') {
      const username = eq.username || 'admin';
      const user = {
        id: 'admin-default',
        name: 'Administrator',
        username: username,
        email: 'admin@victoriadental.com',
        password_hash: username === 'admin' ? 'admin123' : (username === 'staff' ? 'staff' : 'admin'),
        role: username === 'admin' ? 'admin' : 'staff'
      };
      return isSingle ? user : [user];
    }
    
    if (table === 'patients') {
      const pList = [
        { id: 'p1', name: 'Sarah Johnson', phone: '+91 9176733358', email: 'sarah@example.com', age: 34, address: 'No 1/334 Injambakkam, Chennai', medical_history: 'None', is_deleted: 0, created_at: '2026-06-08T00:00:00Z' },
        { id: 'p2', name: 'Michael Chen', phone: '+91 9176733358', email: 'michael@example.com', age: 28, address: 'No 1/334 Injambakkam, Chennai', medical_history: 'Penicillin allergy', is_deleted: 0, created_at: '2026-06-08T00:00:00Z' }
      ];
      if (eq.id) {
        const found = pList.find(p => p.id === eq.id) || pList[0];
        return isSingle ? found : [found];
      }
      return isSingle ? pList[0] : pList;
    }

    if (table === 'settings') {
      const settings = {
        id: 1,
        clinic_name: 'Victoria Dental Care',
        tagline: 'Premium Dental Solutions',
        phone: '+91 9176733358',
        email: 'victoriadentalcare2015@gmail.com',
        address: 'No 1/334 Injambakkam, Chennai',
        whatsapp_number: '+91 9176733358',
        accent_color: '#007aff'
      };
      return isSingle ? settings : [settings];
    }

    if (table === 'prescriptions') {
      const rxList = [
        {
          id: eq.id || 'rx1',
          patient_id: eq.patient_id || 'p1',
          medications: JSON.stringify([{ name: 'Amoxicillin 500mg', price: 45 }, { name: 'Paracetamol 500mg', price: 20 }]),
          diagnosis: 'Dental Infection',
          notes: 'Take after meals twice daily',
          pdf_url: `/api/pdfs/rx-${eq.id || 'rx1'}.pdf`,
          total_amount: 65,
          surgeon_fee: 0,
          date: '2026-06-08'
        }
      ];
      return isSingle ? rxList[0] : rxList;
    }

    if (table === 'appointments') {
      const appts = [
        { id: 'a1', patient_id: 'p1', patient_name: 'Sarah Johnson', date: '2026-06-08', time: '09:00', duration: 30, type: 'checkup', status: 'checkin', notes: 'Regular checkup' }
      ];
      return isSingle ? appts[0] : appts;
    }

    if (table === 'activity_log') {
      const logs = [
        { id: 'act1', text: 'Sarah Johnson checked in', subtext: 'Regular checkup', patient_id: 'p1' }
      ];
      return isSingle ? logs[0] : logs;
    }

    if (table === 'notifications') {
      const notifs = [
        { id: 'n1', type: 'missed', title: 'Missed Appointment', message: 'Sarah Johnson missed her appointment', patient_id: 'p1', read: 0 }
      ];
      return isSingle ? notifs[0] : notifs;
    }

    return isSingle ? {} : [];
  }

  // Promise-like behavior (thenable)
  then(onfulfilled, onrejected) {
    const data = this._getData(false);
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }
}

class MockStorageBucket {
  constructor(bucket) {
    this.bucket = bucket;
  }
  async upload(filename, buffer, options) {
    console.log(`[MockStorage] Uploaded ${filename} to ${this.bucket}`);
    return { data: { path: filename }, error: null };
  }
  async download(filename) {
    console.log(`[MockStorage] Downloaded ${filename} from ${this.bucket}`);
    // Return a mock PDF buffer Blob (so download succeeds)
    const mockPdfBuffer = Buffer.from('%PDF-1.3 mock pdf content');
    // In environments without browser Blob, we can return a Blob using global or fallback
    // Next.js runtime supports Blob
    return { data: new Blob([mockPdfBuffer]), error: null };
  }
  async createBucket(bucket, options) {
    return { data: null, error: null };
  }
}

class MockSupabaseStorage {
  from(bucket) {
    return new MockStorageBucket(bucket);
  }
  async createBucket(bucket, options) {
    return { data: null, error: null };
  }
}

class MockSupabaseClient {
  constructor() {
    this.storage = new MockSupabaseStorage();
  }
  from(table) {
    return new MockQueryBuilder(table);
  }
}

// ═══════════════════════════════════════════

export function getDB() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn('[DB] Supabase environment variables are missing. Using MockSupabaseClient for local verification.');
      return new MockSupabaseClient();
    }
    supabase = createClient(url, key);
  }
  return supabase;
}