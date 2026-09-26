export interface LfsrStep {
  id: number;
  char: string;
  charBinary: string;
  keystreamBinary: string;
  xorResultBinary: string;
  resultChar: string;
  shiftDetails: {
    stateBefore: string;
    tapMath: string;
    newBit: string;
    stateAfter: string;
  }[];
}

export interface LfsrResult {
  resultText: string;
  steps: LfsrStep[];
}

export function processLFSR(text: string, seed: string): LfsrResult {
  const steps: LfsrStep[] = [];
  let resultText = '';

  // Ensure seed is valid binary, default to 1001 if empty/invalid
  let currentSeed = seed.replace(/[^01]/g, '');
  if (currentSeed.length < 2) currentSeed = '1001'; 
  
  // We will use the two rightmost bits for the XOR tap (simplest visual LFSR)
  const tap1 = currentSeed.length - 1;
  const tap2 = currentSeed.length - 2;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBinary = char.charCodeAt(0).toString(2).padStart(8, '0');
    
    let keystreamBinary = '';
    const shiftDetails = [];

    // Generate 8 bits of keystream for this character
    for (let b = 0; b < 8; b++) {
      const stateBefore = currentSeed;
      const bit1 = parseInt(currentSeed[tap1]);
      const bit2 = parseInt(currentSeed[tap2]);
      const newBit = (bit1 ^ bit2).toString();
      
      const outBit = currentSeed[currentSeed.length - 1];
      keystreamBinary += outBit;
      
      // Shift right and insert new bit at the left
      currentSeed = newBit + currentSeed.substring(0, currentSeed.length - 1);
      
      shiftDetails.push({
        stateBefore,
        tapMath: `${bit1} ⊕ ${bit2} = ${newBit}`,
        newBit,
        stateAfter: currentSeed
      });
    }

    // Vernam Cipher (XOR Plaintext with Keystream)
    let xorResultBinary = '';
    for(let bit = 0; bit < 8; bit++) {
      xorResultBinary += (parseInt(charBinary[bit]) ^ parseInt(keystreamBinary[bit])).toString();
    }
    
    const resultChar = String.fromCharCode(parseInt(xorResultBinary, 2));
    resultText += resultChar;

    steps.push({
      id: i,
      char,
      charBinary,
      keystreamBinary,
      xorResultBinary,
      resultChar,
      shiftDetails
    });
  }

  return { resultText, steps };
}
