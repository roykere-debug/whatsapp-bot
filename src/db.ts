import { Pool } from "pg";
import { UserState, UserStateName, UserStateData } from "./types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize schema on module load - but don't block startup
(async () => {
  // Wait a bit before trying to connect to let the server start first
  setTimeout(async () => {
    console.log("[DB] Initializing database connection...");
    try {
      if (!process.env.DATABASE_URL) {
        console.error('[DB] ❌ DATABASE_URL not set, skipping database initialization');
        return;
      }
      
      console.log("[DB] Testing database connection...");
      await pool.query('SELECT NOW()');
      console.log("[DB] ✅ Database connection successful");
      
      console.log("[DB] Creating tables if they don't exist...");
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

        CREATE TABLE IF NOT EXISTS bot_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Initialize bot status to enabled by default if not exists
        INSERT INTO bot_settings (key, value, updated_at)
        VALUES ('bot_enabled', 'true'::jsonb, NOW())
        ON CONFLICT (key) DO NOTHING;
      `);
      console.log("[DB] ✅ Database schema initialized successfully");
    } catch (error) {
      console.error('[DB] ❌ Error initializing database schema:', error);
      if (error instanceof Error) {
        console.error('[DB] Error message:', error.message);
        console.error('[DB] Error stack:', error.stack);
      }
      // Don't exit - let the server start and show the error
      // The server can still run even if DB init fails
    }
  }, 1000); // Wait 1 second before trying DB connection
})();

export async function getUserState(phone: string): Promise<UserState> {
  try {
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
  } catch (error) {
    console.error("[DB] Error getting user state:", error);
    throw new Error(`Failed to get user state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function upsertUserState(state: UserState): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_states (phone, state, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (phone)
       DO UPDATE SET state = EXCLUDED.state,
                     data = EXCLUDED.data,
                     updated_at = NOW()`,
      [state.phone, state.state, state.data]
    );
  } catch (error) {
    console.error("[DB] Error upserting user state:", error);
    throw new Error(`Failed to upsert user state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function insertLead(l: {
  phone: string;
  game: string;
  amount: number;
  isUrgent: boolean;
  isNewCustomer: boolean;
  raw: any;
}): Promise<void> {
  try {
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
  } catch (error) {
    console.error("[DB] Error inserting lead:", error);
    throw new Error(`Failed to insert lead: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get bot enabled status
 */
export async function getBotStatus(): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT value FROM bot_settings WHERE key = 'bot_enabled'`
    );

    if (result.rows.length === 0) {
      // Default to enabled if not set
      return true;
    }

    const value = result.rows[0].value;
    // Handle both boolean and string values
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return Boolean(value);
  } catch (error) {
    console.error("[DB] Error getting bot status:", error);
    // Default to enabled on error
    return true;
  }
}

/**
 * Set bot enabled status
 */
export async function setBotStatus(enabled: boolean): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO bot_settings (key, value, updated_at)
       VALUES ('bot_enabled', $1::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [enabled]
    );
    console.log(`[DB] Bot status set to: ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error("[DB] Error setting bot status:", error);
    throw new Error(`Failed to set bot status: ${error instanceof Error ? error.message : String(error)}`);
  }
}
