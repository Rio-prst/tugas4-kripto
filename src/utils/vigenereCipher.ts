import { CipherStep, CipherResult } from '../types/crypto';
import { CipherError } from '@/lib/cipherError';

export function processVigenere(text: string, key: string, mode: 'encrypt' | 'decrypt'): CipherResult {
  const steps: CipherStep[] = [];
  let resultText = '';

  if (!key.trim()) {
    throw new CipherError('KEY_EMPTY');
  }
  const upperKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!upperKey) {
    throw new CipherError(
      'KEY_NO_LETTERS',
      `"${key}" has no A-Z letters in it.`
    );
  }
  
  const isDecrypt = mode === 'decrypt';
  let keyIndex = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isUpper = char >= 'A' && char <= 'Z';
    const isLower = char >= 'a' && char <= 'z';
    
    if (isUpper || isLower) {
      const base = isUpper ? 65 : 97;
      const originalCode = char.charCodeAt(0) - base;
      
      const keyChar = upperKey[keyIndex % upperKey.length];
      const shiftCode = keyChar.charCodeAt(0) - 65; // A=0, B=1, etc.
      
      let shiftedCode;
      if (isDecrypt) {
        shiftedCode = (originalCode - shiftCode + 26) % 26;
      } else {
        shiftedCode = (originalCode + shiftCode) % 26;
      }
      
      const newChar = String.fromCharCode(shiftedCode + base);
      const sign = isDecrypt ? '-' : '+';
      const formula = `${char}(${originalCode}) ${sign} ${keyChar}(${shiftCode}) ≡ ${shiftedCode} mod 26 -> ${newChar}`;
      
      resultText += newChar;
      steps.push({
        originalChar: char,
        originalCode,
        shiftedCode,
        newChar,
        formula,
        isAlphabetic: true,
      });
      
      keyIndex++;
    } else {
      resultText += char;
      steps.push({
        originalChar: char,
        newChar: char,
        formula: 'N/A (Non-alphabetic)',
        isAlphabetic: false,
      });
    }
  }

  return { resultText, steps };
}
