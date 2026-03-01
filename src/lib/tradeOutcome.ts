// Trade outcome logic based on account type and email
// Demo: mostly wins with occasional losses
// Real (whitneyatieno86@gmail.com & chenyabenard53@gmail.com): mostly wins
// Real (other emails): mostly losses

interface TradeOutcomeConfig {
  accountType: string;
  userEmail: string | null;
  botType?: 'xml' | 'custom';
}

const PRIVILEGED_EMAILS = [
  'whitneyatieno86@gmail.com',
  'chenyabenard53@gmail.com',
];

// Track session trade counts
const sessionTracker: Map<string, { wins: number; losses: number }> = new Map();

export function getTradeOutcome(config: TradeOutcomeConfig): 'win' | 'loss' {
  const { accountType, userEmail, botType = 'xml' } = config;
  const sessionKey = `${accountType}-${userEmail || 'guest'}-${botType}`;

  let tracker = sessionTracker.get(sessionKey);
  if (!tracker) {
    tracker = { wins: 0, losses: 0 };
    sessionTracker.set(sessionKey, tracker);
  }

  let result: 'win' | 'loss';
  const isPrivileged = userEmail && PRIVILEGED_EMAILS.includes(userEmail);

  if (accountType === 'demo') {
    // Demo accounts: XML ~75% win, Custom ~75% win
    const winChance = botType === 'xml' ? 0.75 : 0.75;
    if (Math.random() < winChance) {
      result = 'win';
      tracker.wins++;
    } else {
      result = 'loss';
      tracker.losses++;
    }
  } else if (isPrivileged) {
    // Privileged real accounts: XML ~75% win, Custom ~70% win
    const winChance = botType === 'xml' ? 0.75 : 0.70;
    if (Math.random() < winChance) {
      result = 'win';
      tracker.wins++;
    } else {
      result = 'loss';
      tracker.losses++;
    }
  } else {
    // Other real accounts: XML ~75% win, Custom mostly losses
    const winChance = botType === 'xml' ? 0.75 : 0.15;
    if (Math.random() < winChance) {
      result = 'win';
      tracker.wins++;
    } else {
      result = 'loss';
      tracker.losses++;
    }
  }

  return result;
}

export function resetSessionTracker(accountType: string, userEmail: string | null) {
  const sessionKey = `${accountType}-${userEmail || 'guest'}`;
  sessionTracker.delete(sessionKey);
  sessionTracker.delete(`${sessionKey}-xml`);
  sessionTracker.delete(`${sessionKey}-custom`);
}
