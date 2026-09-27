const bcrypt = require('bcryptjs');
const { getDB } = require('../db/database');

class AuthService {
  get db() {
    return getDB();
  }

  /**
   * Authenticate a user by credentials.
   * Locks account after 3 failures.
   */
  login(email, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
    if (!user) {
      throw new Error('User not found or inactive.');
    }

    if (user.is_active === 0) {
      throw new Error('User account is suspended.');
    }

    // Check account lock
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until);
      if (lockTime > new Date()) {
        const minsLeft = Math.ceil((lockTime - new Date()) / 1000 / 60);
        throw new Error(`Account is locked. Please try again after ${minsLeft} minutes.`);
      } else {
        // Lock expired, reset
        this.db.prepare('UPDATE users SET locked_until = NULL, failed_login_count = 0 WHERE id = ?').run(user.id);
      }
    }

    // Check password
    const isMatched = bcrypt.compareSync(password, user.password_hash);
    if (!isMatched) {
      const failures = user.failed_login_count + 1;
      let updateQuery = 'UPDATE users SET failed_login_count = ? WHERE id = ?';
      const params = [failures, user.id];

      if (failures >= 3) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
        updateQuery = 'UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?';
        params.splice(1, 0, lockUntil);
        this.db.prepare(updateQuery).run(...params);
        throw new Error('Too many failed attempts. Your account is locked for 15 minutes.');
      } else {
        this.db.prepare(updateQuery).run(...params);
        throw new Error(`Invalid credentials. ${3 - failures} attempts remaining.`);
      }
    }

    // Reset failure counter and register successful login
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE users 
      SET failed_login_count = 0, locked_until = NULL, last_login_at = ? 
      WHERE id = ?
    `).run(now, user.id);

    // Return safe user structure
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_access: user.company_access ? JSON.parse(user.company_access) : null,
      force_password_change: user.force_password_change
    };
  }

  /**
   * Reset / Update user password.
   */
  updatePassword(userId, currentPassword, newPassword) {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found.');

    const isMatched = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatched) throw new Error('Invalid current password.');

    const hash = bcrypt.hashSync(newPassword, 10);
    this.db.prepare(`
      UPDATE users 
      SET password_hash = ?, force_password_change = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(hash, userId);

    return true;
  }
}

module.exports = new AuthService();
