import crypto from 'crypto';
import { syncUserToFirestore } from '../config/firebaseAdmin.js';

// In-memory user database
const userStore = new Map();

// Simple JWT-style Token Generator
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, exp: Date.now() + 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', 'codemafiasercretkey').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function registerUser(email, username, password) {
  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required.');
  }

  const existing = Array.from(userStore.values()).find(u => u.email === email || u.username === username);
  if (existing) {
    throw new Error('User with this email or username already exists.');
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const user = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email,
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  userStore.set(user.id, user);
  const token = generateToken(user);

  try {
    syncUserToFirestore(user);
  } catch (e) {}

  return {
    user: { id: user.id, email: user.email, username: user.username },
    token
  };
}

export function loginUser(usernameOrEmail, password, allowAutoRegister = false) {
  if (!usernameOrEmail || !password) {
    throw new Error('Username/email and password are required.');
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  let user = Array.from(userStore.values()).find(
    u => (u.email === usernameOrEmail || u.username === usernameOrEmail)
  );

  if (user) {
    if (user.passwordHash !== passwordHash) {
      throw new Error('Invalid email/username or password. Please check your credentials or click Sign Up to register.');
    }
  } else if (allowAutoRegister) {
    const isEmail = usernameOrEmail.includes('@');
    const email = isEmail ? usernameOrEmail : `${usernameOrEmail}@codemafia.com`;
    const username = isEmail ? usernameOrEmail.split('@')[0] : usernameOrEmail;

    user = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email,
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    userStore.set(user.id, user);
    try {
      syncUserToFirestore(user);
    } catch (e) {}
  } else {
    throw new Error('Invalid email/username or password. Please check your credentials or click Sign Up to register.');
  }

  const token = generateToken(user);
  return {
    user: { id: user.id, email: user.email, username: user.username },
    token
  };
}
