// Trade outcome logic based on account type and email
// Demo: mostly wins with one loss per session
// Real (whitneyatieno86@gmail.com): mostly wins with one loss
// Real (other emails): mostly losses with only 2 wins per session

interface TradeOutcomeConfig {
  accountType: string;
  userEmail: string | null;
  botType?: 'xml' | 'custom';
}

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

  if (accountType === 'demo') {
    if (botType === 'custom') {
      // Custom bots on demo: realistic ~55% win rate
      if (Math.random() < 0.55) {
        result = 'win';
        tracker.wins++;
      } else {
        result = 'loss';
        tracker.losses++;
      }
    } else {
      // XML bots on demo: mostly wins, max 1 loss per session
      if (tracker.losses < 1 && Math.random() < 0.15) {
        result = 'loss';
        tracker.losses++;
      } else {
        result = 'win';
        tracker.wins++;
      }
    }
  } else if (userEmail === 'whitneyatieno86@gmail.com') {
    if (botType === 'custom') {
      // Custom bots for special email: realistic ~58% win rate
      if (Math.random() < 0.58) {
        result = 'win';
        tracker.wins++;
      } else {
        result = 'loss';
        tracker.losses++;
      }
    } else {
      // XML bots for special email: mostly wins, max 1 loss
      if (tracker.losses < 1 && Math.random() < 0.15) {
        result = 'loss';
        tracker.losses++;
      } else {
        result = 'win';
        tracker.wins++;
      }
    }
  } else {
    // Other real accounts: mostly losses regardless of bot type
    const maxWins = botType === 'custom' ? 2 : 2;
    if (tracker.wins < maxWins && Math.random() < 0.15) {
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
}
