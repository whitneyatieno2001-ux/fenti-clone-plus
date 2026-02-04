// Trade outcome logic based on account type and email
// Demo: mostly wins with one loss per session
// Real (whitneyatieno86@gmail.com): mostly wins with one loss
// Real (other emails): mostly losses with only 2 wins per session

interface TradeOutcomeConfig {
  accountType: 'demo' | 'real';
  userEmail: string | null;
}

// Track session trade counts
const sessionTracker: Map<string, { wins: number; losses: number }> = new Map();

export function getTradeOutcome(config: TradeOutcomeConfig): 'win' | 'loss' {
  const { accountType, userEmail } = config;
  const sessionKey = `${accountType}-${userEmail || 'guest'}`;
  
  let tracker = sessionTracker.get(sessionKey);
  if (!tracker) {
    tracker = { wins: 0, losses: 0 };
    sessionTracker.set(sessionKey, tracker);
  }

  let result: 'win' | 'loss';

  if (accountType === 'demo') {
    // Demo: mostly wins, max 1 loss per session
    if (tracker.losses < 1 && Math.random() < 0.15) {
      result = 'loss';
      tracker.losses++;
    } else {
      result = 'win';
      tracker.wins++;
    }
  } else if (userEmail === 'whitneyatieno86@gmail.com') {
    // Special email on real account: mostly wins, max 1 loss
    if (tracker.losses < 1 && Math.random() < 0.15) {
      result = 'loss';
      tracker.losses++;
    } else {
      result = 'win';
      tracker.wins++;
    }
  } else {
    // Other real accounts: mostly losses, max 2 wins per session
    if (tracker.wins < 2 && Math.random() < 0.15) {
      result = 'win';
      tracker.wins++;
    } else {
      result = 'loss';
      tracker.losses++;
    }
  }

  return result;
}

export function resetSessionTracker(accountType: 'demo' | 'real', userEmail: string | null) {
  const sessionKey = `${accountType}-${userEmail || 'guest'}`;
  sessionTracker.delete(sessionKey);
}
