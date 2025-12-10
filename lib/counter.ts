/**
 * Counter management utilities for YigiCoin platform
 * Handles rank durations and counter reset logic
 */

// Rank duration configuration in seconds
// MODIFICADO: TODOS los rangos ahora tienen 5 minutos (300 segundos)
export const RANK_DURATIONS: Record<string, number> = {
  registrado: 300, // 5 minutos
  invitado: 300,   // 5 minutos
  basico: 300,     // 5 minutos
  vip: 300,        // 5 minutos
  premium: 300,    // 5 minutos
  elite: 300,      // 5 minutos
};

/**
 * Get the duration in seconds for a specific rank
 * @param rank - The rank identifier
 * @returns Duration in seconds, 300 (5 min) for all ranks
 */
export function getRankDurationSec(rank: string): number {
  return RANK_DURATIONS[rank] || 300;
}

/**
 * Reset counter for a user when they convert an invite
 * Only applies to users with rank === 'Registrado'
 * Resets counterEndsAt to 5 minutes (300 seconds) without deducting points
 * 
 * @param inviterId - The user ID of the inviter
 * @returns Updated user object or null if not applicable
 */
export function resetCounterOnInviteConversion(inviterId: string): any | null {
  try {
    // Load user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}');
    
    // Check if user has the 'registrado' rank
    if (userData.currentRank !== 'registrado') {
      console.log('Counter reset not applicable - user is not in Registrado rank');
      return null;
    }
    
    // Calculate new counter end time (5 minutes from now)
    const now = new Date();
    const duration = getRankDurationSec(userData.currentRank || 'registrado'); // 300 seconds
    const counterEndsAt = new Date(now.getTime() + duration * 1000);
    
    // Update user data
    userData.counterEndsAt = counterEndsAt.toISOString();
    userData.lastCounterReset = now.toISOString();
    userData.counterResetReason = 'invite_conversion';
    
    // Save updated data
    localStorage.setItem('user_simulation_data', JSON.stringify(userData));
    
    console.log(`Counter reset for inviter ${inviterId} - New end time: ${counterEndsAt.toISOString()}`);
    
    return userData;
  } catch (error) {
    console.error('Error resetting counter on invite conversion:', error);
    return null;
  }
}

/**
 * Calculate remaining time for a counter
 * @param counterEndsAt - ISO string of when the counter ends
 * @returns Remaining seconds
 */
export function getRemainingTime(counterEndsAt: string): number {
  try {
    const endTime = new Date(counterEndsAt);
    const now = new Date();
    const remainingMs = endTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(remainingMs / 1000));
  } catch (error) {
    console.error('Error calculating remaining time:', error);
    return 0;
  }
}

/**
 * Format seconds to human-readable time string
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "1d 2h 30m 45s")
 */
export function formatTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}