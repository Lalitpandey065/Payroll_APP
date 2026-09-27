const { getDB, newId } = require('../database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Get the database singleton.
   * @returns {import('better-sqlite3').Database}
   */
  get db() {
    return getDB();
  }

  /**
   * Find record by ID.
   * @param {string} id 
   * @returns {object|null}
   */
  findById(id) {
    try {
      const row = this.db.prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE id = ? AND deleted_at IS NULL
      `).get(id);
      return row || null;
    } catch (e) {
      console.error(`[BaseRepo] Error in findById for ${this.tableName}:`, e);
      throw e;
    }
  }

  /**
   * Find all matching records.
   * @param {object} [filters] key-value query filters
   * @returns {array}
   */
  findAll(filters = {}) {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
      const params = [];

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          query += ` AND ${key} = ?`;
          params.push(filters[key]);
        }
      });

      return this.db.prepare(query).all(...params);
    } catch (e) {
      console.error(`[BaseRepo] Error in findAll for ${this.tableName}:`, e);
      throw e;
    }
  }

  /**
   * Insert a new record.
   * @param {object} data 
   * @returns {object} The created record
   */
  insert(data) {
    try {
      const id = data.id || newId();
      const now = new Date().toISOString();
      const record = {
        ...data,
        id,
        created_at: data.created_at || now,
        updated_at: data.updated_at || now,
        synced: 0
      };

      const keys = Object.keys(record);
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(record);

      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `;

      this.db.prepare(query).run(...values);

      // Enqueue sync (skip sync_queue and audit_log itself to prevent infinite loops)
      if (this.tableName !== 'sync_queue' && this.tableName !== 'audit_log') {
        this.enqueueSync(this.tableName, id, 'INSERT', record);
      }

      return record;
    } catch (e) {
      console.error(`[BaseRepo] Error in insert for ${this.tableName}:`, e);
      throw e;
    }
  }

  /**
   * Update an existing record.
   * @param {string} id 
   * @param {object} data 
   * @returns {object} The updated record
   */
  update(id, data) {
    try {
      const now = new Date().toISOString();
      
      // Filter out fields we do not want to set manually via update map
      const { id: _, created_at: __, ...updateFields } = data;

      const record = {
        ...updateFields,
        updated_at: now,
        synced: 0
      };

      const keys = Object.keys(record);
      const assignments = keys.map(key => `${key} = ?`).join(', ');
      const values = Object.values(record);

      const query = `
        UPDATE ${this.tableName}
        SET ${assignments}
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = this.db.prepare(query).run(...values, id);
      if (result.changes === 0) {
        throw new Error(`Record with id ${id} not found in ${this.tableName}`);
      }

      const updatedRecord = this.findById(id);

      if (this.tableName !== 'sync_queue' && this.tableName !== 'audit_log') {
        this.enqueueSync(this.tableName, id, 'UPDATE', updatedRecord);
      }

      return updatedRecord;
    } catch (e) {
      console.error(`[BaseRepo] Error in update for ${this.tableName}:`, e);
      throw e;
    }
  }

  /**
   * Soft delete a record by ID.
   * @param {string} id 
   * @returns {boolean}
   */
  softDelete(id) {
    try {
      const now = new Date().toISOString();
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, synced = 0
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = this.db.prepare(query).run(now, id);
      if (result.changes === 0) {
        throw new Error(`Record with id ${id} not found or already deleted in ${this.tableName}`);
      }

      if (this.tableName !== 'sync_queue' && this.tableName !== 'audit_log') {
        this.enqueueSync(this.tableName, id, 'DELETE', { id, deleted_at: now });
      }

      return true;
    } catch (e) {
      console.error(`[BaseRepo] Error in softDelete for ${this.tableName}:`, e);
      throw e;
    }
  }

  /**
   * Enqueue sync record.
   */
  enqueueSync(tableName, recordId, operation, payload) {
    try {
      const syncId = newId();
      const syncRecord = {
        id: syncId,
        table_name: tableName,
        record_id: recordId,
        operation: operation,
        payload_json: JSON.stringify(payload),
        synced: 0,
        created_at: new Date().toISOString()
      };

      const keys = Object.keys(syncRecord);
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(syncRecord);

      this.db.prepare(`
        INSERT INTO sync_queue (${keys.join(', ')})
        VALUES (${placeholders})
      `).run(...values);
    } catch (e) {
      console.error(`[BaseRepo] Error in enqueueSync for ${tableName}:`, e);
    }
  }
}

module.exports = BaseRepository;
