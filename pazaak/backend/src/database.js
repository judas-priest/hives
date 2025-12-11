import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
  constructor(dbPath = join(__dirname, '../database/pazaak.db')) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeDatabase();
  }

  initializeDatabase() {
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  // User operations
  createUser(username, passwordHash) {
    const stmt = this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);

    // Initialize player stats for new user
    const statsStmt = this.db.prepare('INSERT INTO player_stats (user_id) VALUES (?)');
    statsStmt.run(result.lastInsertRowid);

    return result.lastInsertRowid;
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  getUserById(id) {
    const stmt = this.db.prepare('SELECT id, username, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  // Player statistics
  getPlayerStats(userId) {
    const stmt = this.db.prepare(`
      SELECT ps.*, u.username
      FROM player_stats ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.user_id = ?
    `);
    return stmt.get(userId);
  }

  updatePlayerStats(userId, stats) {
    const stmt = this.db.prepare(`
      UPDATE player_stats
      SET matches_played = matches_played + ?,
          matches_won = matches_won + ?,
          matches_lost = matches_lost + ?,
          rounds_won = rounds_won + ?,
          rounds_lost = rounds_lost + ?,
          total_score = total_score + ?
      WHERE user_id = ?
    `);
    return stmt.run(
      stats.matchesPlayed || 0,
      stats.matchesWon || 0,
      stats.matchesLost || 0,
      stats.roundsWon || 0,
      stats.roundsLost || 0,
      stats.totalScore || 0,
      userId
    );
  }

  // Match history
  createMatch(player1Id, player2Id) {
    const stmt = this.db.prepare(`
      INSERT INTO match_history (player1_id, player2_id)
      VALUES (?, ?)
    `);
    return stmt.run(player1Id, player2Id).lastInsertRowid;
  }

  updateMatchResult(matchId, winnerId, player1Score, player2Score) {
    const stmt = this.db.prepare(`
      UPDATE match_history
      SET winner_id = ?, player1_score = ?, player2_score = ?
      WHERE id = ?
    `);
    return stmt.run(winnerId, player1Score, player2Score, matchId);
  }

  addRound(matchId, roundNumber, winnerId, player1Score, player2Score) {
    const stmt = this.db.prepare(`
      INSERT INTO round_history (match_id, round_number, winner_id, player1_final_score, player2_final_score)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(matchId, roundNumber, winnerId, player1Score, player2Score);
  }

  getMatchHistory(userId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT
        mh.*,
        u1.username as player1_name,
        u2.username as player2_name,
        uw.username as winner_name
      FROM match_history mh
      JOIN users u1 ON mh.player1_id = u1.id
      JOIN users u2 ON mh.player2_id = u2.id
      LEFT JOIN users uw ON mh.winner_id = uw.id
      WHERE mh.player1_id = ? OR mh.player2_id = ?
      ORDER BY mh.played_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, userId, limit);
  }

  getLeaderboard(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT
        u.username,
        ps.matches_played,
        ps.matches_won,
        ps.matches_lost,
        ROUND(CAST(ps.matches_won AS FLOAT) / NULLIF(ps.matches_played, 0) * 100, 2) as win_rate
      FROM player_stats ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.matches_played > 0
      ORDER BY ps.matches_won DESC, win_rate DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  close() {
    this.db.close();
  }
}

export default DatabaseManager;
