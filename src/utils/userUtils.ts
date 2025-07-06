/**
 * Utility functions for user display and privacy
 */

/**
 * Safely displays a username by extracting the part before @ from email addresses
 * This ensures privacy in public leaderboards and feeds
 * @param username - The username or email to process
 * @returns A safe display name without revealing full email addresses
 */
export function getSafeDisplayName(username: string): string {
  if (!username) return 'Usuario'
  
  // If it contains @, extract the part before it (email case)
  if (username.includes('@')) {
    const beforeAt = username.split('@')[0]
    return beforeAt || 'Usuario'
  }
  
  // If it's already a clean username, return as is
  return username
}

/**
 * Generates initials for avatar display from a username
 * @param username - The username to generate initials from
 * @returns 1-2 character initials
 */
export function getUserInitials(username: string): string {
  const safeName = getSafeDisplayName(username)
  
  if (!safeName || safeName === 'Usuario') {
    return 'U'
  }
  
  const words = safeName.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  
  return safeName.charAt(0).toUpperCase()
}

/**
 * Checks if a username is likely an email address
 * @param username - The username to check
 * @returns true if it appears to be an email
 */
export function isEmailUsername(username: string): boolean {
  if (!username) return false
  return username.includes('@') && username.includes('.')
} 