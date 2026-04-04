'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const commonPasswords = [
  'password', '123456', '123456789', '1234567890', 'qwerty', 'abc123', 'letmein',
  'welcome', 'admin', 'login', 'master', 'monkey', 'dragon', 'sunshine', 'princess',
  'baseball', 'football', 'soccer', 'hockey', 'liverpool', 'chelsea', 'arsenal',
  'jordan', 'michael', 'shadow', 'superman', 'batman', 'spider', 'pokemon',
  'starwars', 'harrypotter', 'iloveyou', 'trustno1', 'hello', 'whatever',
  'ashley', 'bailey', 'passw0rd', 'shadow', 'computer', 'server', 'database'
];

const keyboardPatterns = [
  'qwerty', 'qwertz', 'azerty', 'asdf', 'zxcv', 'qazwsx', '1qaz', '2wsx',
  '1234', '2345', '3456', '4567', '5678', '6789', '7890', 'abcd', 'bcde',
  'cdef', 'defg', '!@#$', '@#$%', 'poiuy', 'lkjh', 'mnbv'
];

const charSets = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

const leetMap: Record<string, string> = {
  '4': 'a', '3': 'e', '1': 'i', '|': 'l', '0': 'o', '5': 's', '7': 't', '$': 's'
};

interface CheckResult {
  checks: boolean[];
  score: number;
  entropy: number;
  crackTime: string;
  warnings: string[];
  feedback: string[];
}

function detectSequentialChars(str: string): boolean {
  let count = 0;
  for (let i = 0; i < str.length - 1; i++) {
    if (str.charCodeAt(i + 1) - str.charCodeAt(i) === 1) count++;
    else count = 0;
    if (count >= 2) return true;
  }
  return false;
}

function detectRepeatedChars(str: string): boolean {
  for (let i = 0; i < str.length - 2; i++) {
    if (str[i] === str[i + 1] && str[i] === str[i + 2]) return true;
  }
  return false;
}

function detectKeyboardPatterns(password: string): boolean {
  const lower = password.toLowerCase();
  return keyboardPatterns.some(p => lower.includes(p));
}

function detectCommonPasswords(password: string): boolean {
  const lower = password.toLowerCase();
  return commonPasswords.some(p => lower === p || lower.includes(p));
}

function detectLeetSpeak(password: string): boolean {
  const lower = password.toLowerCase();
  let converted = lower;
  for (const [leet, char] of Object.entries(leetMap)) {
    converted = converted.split(leet).join(char);
  }
  return converted !== lower && commonPasswords.some(p => converted.includes(p));
}

function calculateEntropy(password: string): number {
  if (!password) return 0;
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) charsetSize += 32;
  return Math.floor(password.length * Math.log2(charsetSize || 1));
}

function estimateCrackTime(entropy: number): string {
  const guesses = Math.pow(2, entropy);
  const guessesPerSecond = 1e10;
  const seconds = guesses / guessesPerSecond;
  
  if (seconds < 1) return 'Instant';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1000) return `${Math.round(seconds / 31536000)} centuries`;
  return 'Millennia+';
}

function checkPassword(password: string): CheckResult {
  if (!password) return { checks: [], score: 0, entropy: 0, crackTime: 'Instant', warnings: [], feedback: [] };

  const warnings: string[] = [];
  const feedback: string[] = [];

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  const hasNoCommon = !detectCommonPasswords(password);
  const hasNoKeyboard = !detectKeyboardPatterns(password);
  const hasNoSequential = !detectSequentialChars(password);
  const hasNoRepeated = !detectRepeatedChars(password);
  const hasNoLeet = !detectLeetSpeak(password);

  if (!hasNoCommon) {
    warnings.push('Contains common password');
    feedback.push('Avoid common passwords');
  }
  if (!hasNoKeyboard) {
    warnings.push('Keyboard pattern detected');
    feedback.push('Avoid keyboard patterns');
  }
  if (!hasNoSequential) {
    warnings.push('Sequential characters detected');
    feedback.push('Avoid sequential characters');
  }
  if (!hasNoRepeated) {
    warnings.push('Repeated characters detected');
    feedback.push('Avoid repeating characters');
  }
  if (!hasNoLeet) {
    warnings.push('Leetspeak detected');
    feedback.push('Avoid substitutions like @ for a');
  }
  if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  }
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    feedback.push('Mix different character types');
  }

  const typeCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const entropy = calculateEntropy(password);
  const crackTime = estimateCrackTime(entropy);

  let score = typeCount * 15 + entropy / 4;
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (hasNoCommon) score += 10;
  if (hasNoKeyboard) score += 5;
  if (hasNoSequential) score += 5;
  if (hasNoRepeated) score += 5;
  if (password.length >= 20) score += 5;

  const checks = [
    password.length >= 8,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    hasNoCommon && hasNoKeyboard && hasNoSequential && hasNoRepeated
  ];

  score = Math.min(100, Math.round(score));
  return { checks, score, entropy, crackTime, warnings, feedback };
}

function generateSecurePassword(length: number = 16): string {
  const allChars = charSets.upper + charSets.lower + charSets.numbers + charSets.special;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += allChars[array[i] % allChars.length];
  }
  return password;
}

function getStrengthLevel(score: number): string {
  if (score < 25) return 'weak';
  if (score < 50) return 'fair';
  if (score < 75) return 'good';
  return 'strong';
}

function getStrengthColor(level: string): string {
  const colors: Record<string, string> = {
    weak: '#ff4757',
    fair: '#ffa502',
    good: '#7bed9f',
    strong: '#00d4aa'
  };
  return colors[level];
}

const requirementLabels = [
  'Add at least 8 characters',
  'Add uppercase letters (A-Z)',
  'Add lowercase letters (a-z)',
  'Add numbers (0-9)',
  'Add special characters (!@#$%)',
  'Avoid common patterns'
];

function getSuggestions(checks: boolean[]): string[] {
  return checks
    .map((checked, i) => (!checked ? requirementLabels[i] : null))
    .filter((suggestion): suggestion is string => suggestion !== null);
}

export default function Home() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<CheckResult>({ checks: [], score: 0, entropy: 0, crackTime: 'Instant', warnings: [], feedback: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResult(checkPassword(password));
  }, [password]);

  useEffect(() => {
    return () => {
      setPassword('');
    };
  }, []);

  const handleGenerate = useCallback(() => {
    const newPassword = generateSecurePassword(16);
    setPassword(newPassword);
    setShowPassword(true);
    inputRef.current?.focus();
  }, []);

  const handleCopy = useCallback(async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
    }
  }, [password]);

  const handleClear = useCallback(() => {
    setPassword('');
  }, []);

  const level = getStrengthLevel(result.score);
  const color = getStrengthColor(level);
  const activeBars = Math.ceil((result.score / 100) * 4);
  const suggestions = getSuggestions(result.checks);
  const entropyLabel = result.entropy < 28 ? 'Very Weak' : 
                      result.entropy < 36 ? 'Weak' : 
                      result.entropy < 60 ? 'Moderate' : 
                      result.entropy < 80 ? 'Strong' : 'Very Strong';

  return (
    <div className="card">
      <div className="header">
        <h1 className="title">Password Strength</h1>
        <p className="subtitle">Check how secure your password is</p>
      </div>

      <div className="input-wrapper">
        <div className="input-container">
          <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            className="password-input"
            placeholder="Enter your password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="input-actions">
              <button
                className="action-btn"
                onClick={handleClear}
                aria-label="Clear password"
                title="Clear"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <button
                className="action-btn"
                onClick={handleCopy}
                aria-label="Copy password"
                title="Copy"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          )}
          <button
            className="toggle-visibility"
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.72a3 3 0 0 0-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <button className="generate-btn" onClick={handleGenerate}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2v6h-6"/>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        Generate Strong Password
      </button>

      <div className="strength-section">
        <div className="strength-header">
          <div>
            <span className="strength-label" style={{ color }}>{level} strength</span>
            {password && (
              <span className="entropy-label" style={{ color: getStrengthColor(level) }}>
                {' '} · {entropyLabel}
              </span>
            )}
          </div>
          <span className="strength-score" style={{ color }}>{result.score}/100</span>
        </div>
        <div className="strength-meter">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`meter-bar ${i < activeBars ? 'active' : ''}`}
              style={i < activeBars ? { background: color } : {}}
            />
          ))}
        </div>
      </div>

      <div className="checklist-section">
        <div className="checklist-title">Requirements</div>
        <div className="checklist">
          {[
            'At least 8 characters',
            'Uppercase letter (A-Z)',
            'Lowercase letter (a-z)',
            'Number (0-9)',
            'Special character (!@#$%)',
            'No common patterns'
          ].map((text, i) => (
            <div
              key={i}
              className={`checklist-item visible ${result.checks[i] ? 'checked' : ''}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <div className="check-circle">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span className="check-text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {password && (
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">Crack Time</span>
            <span className="stat-value" style={{ color }}>{result.crackTime}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Entropy</span>
            <span className="stat-value" style={{ color }}>{result.entropy} bits</span>
          </div>
        </div>
      )}

      {password && result.feedback.length > 0 && (
        <div className="suggestions-section">
          <div className="suggestions-title">Improvement Tips</div>
          <div className="suggestions-list">
            {result.feedback.map((tip, i) => (
              <div key={i} className="suggestion-item">
                <svg className="suggestion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tips-section">
        <div className="tips-header">
          <svg className="tips-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="tips-title">Security Tips</span>
        </div>
        <div className="tips-list">
          <div className="tip-item">Use a unique password for each account</div>
          <div className="tip-item">Consider using a password manager</div>
          <div className="tip-item">Enable two-factor authentication when possible</div>
        </div>
      </div>
    </div>
  );
}