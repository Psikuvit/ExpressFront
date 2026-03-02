export const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateLoginForm = (username: string, password: string): string | null => {
  if (!username.trim()) return 'Username is required';
  if (!password.trim()) return 'Password is required';
  return null;
};

export const validateRegisterForm = (
  username: string,
  email: string,
  password: string,
  confirmPassword: string
): string | null => {
  if (username.trim().length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  if (!validateEmail(email)) return 'Please enter a valid email';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};
