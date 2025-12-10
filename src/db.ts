import { Pool } from "pg";
import { UserState, UserStateName, UserStateData } from "./types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize schema on module load
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_states (
        phone TEXT PRIMARY KEY,
        state TEXT NOT NULL DEFAULT 'idle',
        data JSONB DEFAULT '{}',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_states_updated_at ON user_states(updated_at);

      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        game TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        is_urgent BOOLEAN NOT NULL,
        is_new_customer BOOLEAN NOT NULL,
        raw JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
    `);
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
})();

export async function getUserState(phone: string): Promise<UserState> {
  const result = await pool.query(
    `SELECT phone, state, data, updated_at
     FROM user_states
     WHERE phone = $1`,
    [phone]
  );

  if (result.rows.length === 0) {
    return {
      phone,
      state: "idle",
      data: {},
      updatedAt: new Date().toISOString()
    };
  }

  const row = result.rows[0];

  return {
    phone: row.phone,
    state: row.state,
    data: row.data,
    updatedAt: row.updated_at
  };
}

export async function upsertUserState(state: UserState): Promise<void> {
  await pool.query(
    `INSERT INTO user_states (phone, state, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (phone)
     DO UPDATE SET state = EXCLUDED.state,
                   data = EXCLUDED.data,
                   updated_at = NOW()`,
    [state.phone, state.state, state.data]
  );
}

export async function insertLead(l: {
  phone: string;
  game: string;
  amount: number;
  isUrgent: boolean;
  isNewCustomer: boolean;
  raw: any;
}): Promise<void> {
  await pool.query(
    `INSERT INTO leads (phone, game, amount, is_urgent, is_new_customer, raw)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      l.phone,
      l.game,
      l.amount,
      l.isUrgent,
      l.isNewCustomer,
      l.raw
    ]
  );
}
