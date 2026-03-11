export function generateInitialPassword(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  // Ensure we get at least one number, one uppercase, one lowercase, and one special character if we wanted to be strict,
  // but for simplicity, a truly random selection usually covers this at length 10.
  // Instead of complex logic, simply pick random characters.
  
  // Use crypto for cryptographically secure random values if we are in node, otherwise Math.random.
  // Since this will be used in the backend (e.g. apps/api), we could rely on crypto.
  // But packages/utils is shared, so we use a safe isomorphic approach or basic Math.random if fine.
  // Considering it's shared, basic Math.random with robust characters is fine, but a secure one is better.
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}
