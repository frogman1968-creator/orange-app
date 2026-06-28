/**
 * DEPRECATED — this file conflicts with pages/api/auth/yahoo/index.js
 * The Yahoo OAuth flow lives in pages/api/auth/yahoo/ (directory).
 * This file must be deleted from the repo.
 *
 * Run: git rm pages/api/auth/yahoo.js
 */
export default function handler(req, res) {
  res.status(410).json({ error: 'This endpoint has moved to /api/auth/yahoo/' });
}
