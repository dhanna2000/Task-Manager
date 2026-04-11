/**
 * Parse @mention or raw snowflake from modal / free text.
 * @param {string} raw
 * @returns {string | null} user id or null
 */
function parseDiscordUserId(raw) {
  const s = String(raw ?? '').trim();
  const mention = s.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{17,20}$/.test(s)) return s;
  return null;
}

module.exports = { parseDiscordUserId };
