'use client';

import { useState } from 'react';
import { processVigenere } from '@/utils/vigenereCipher';
import { CipherResult } from '@/types/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Lock, Unlock, TriangleAlert } from 'lucide-react';
import { ValidationNotice } from '@/components/ValidationNotice';
import { ResultStatus } from '@/components/ResultStatus';
import { CopyButton } from '@/components/CopyButton';
import { useCipherRun } from '@/hooks/useCipherRun';
import { CipherError } from '@/lib/cipherError';
import { checkInputLength } from '@/lib/cipherLimits';

export default function VigenereCipherPage() {
  const [inputText, setInputText] = useState('');
  const [shiftKey, setShiftKey] = useState('KEY');
  const { result, error, run, mode, setMode } = useCipherRun<CipherResult>();

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    run(() => {
      if (!inputText) {
        throw new CipherError('EMPTY_INPUT');
      }
      checkInputLength(inputText.length, 'vigenere');
      return processVigenere(inputText, shiftKey, selectedMode);
    });
  };

  // Generate an array of repeated key characters matching the plaintext length (for visualization only)
  const getRepeatedKey = () => {
    if (!shiftKey) return '';
    const cleanKey = shiftKey.toUpperCase().replace(/[^A-Z]/g, '') || 'A';
    let resultStr = '';
    let kIdx = 0;
    for (let i = 0; i < inputText.length; i++) {
      if (/[a-zA-Z]/.test(inputText[i])) {
        resultStr += cleanKey[kIdx % cleanKey.length];
        kIdx++;
      } else {
        resultStr += ' '; // space for non-alphabetic
      }
    }
    return resultStr;
  };
  const repeatedKey = getRepeatedKey();

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Vigenère Cipher</h1>
        <p className="text-muted-foreground">
          A polyalphabetic substitution cipher using a keyword to determine the shift for each letter.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Enter your text and keyword.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Text (Plaintext or Ciphertext)</Label>
              <Textarea
                id="input-text"
                placeholder="Enter text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] resize-none uppercase"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift-key">Keyword</Label>
              <Input
                id="shift-key"
                type="text"
                value={shiftKey}
                onChange={(e) => setShiftKey(e.target.value.toUpperCase())}
                className="max-w-xs uppercase"
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={() => handleProcess('encrypt')}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="w-4 h-4 mr-2" />
                Encrypt
              </Button>
              <Button 
                onClick={() => handleProcess('decrypt')}
                variant="secondary"
                className="flex-1"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Decrypt
              </Button>
            </div>

            <ValidationNotice info={error} />
          </CardContent>
        </Card>

        {/* Final Result Section */}
        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
            <CardDescription>
              The resulting {result ? (mode === 'encrypt' ? 'Ciphertext' : 'Plaintext') : 'text'} will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex flex-col items-center justify-center border space-y-4">
              {result ? (
                <>
                  <p className="text-2xl font-mono text-center break-all text-foreground uppercase">
                    {result.resultText}
                  </p>
                  <CopyButton value={result.resultText} />
                </>
              ) : error ? (
                <p className="text-muted-foreground flex items-center">
                  <TriangleAlert className="w-5 h-5 mr-2" />
                  No result. See the message on the left.
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center">
                  <ArrowRight className="w-5 h-5 mr-2 animate-pulse" />
                  Awaiting input
                </p>
              )}
            </div>
            <ResultStatus hasResult={Boolean(result)} error={error} mode={mode} />
          </CardContent>
        </Card>
      </div>

      {/* Keyword Alignment Visualization */}
      {inputText && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Alignment</CardTitle>
            <CardDescription>How the keyword maps to your text.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="flex flex-col gap-2 min-w-max">
                <div className="flex">
                  <div className="w-24 font-bold text-sm flex items-center">Text</div>
                  {inputText.split('').map((char, i) => (
                    <div key={`t-${i}`} className={`w-8 h-8 flex items-center justify-center border font-mono text-sm ${/[a-zA-Z]/.test(char) ? 'bg-muted/30' : 'bg-transparent border-transparent'}`}>
                      {char.toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <div className="w-24 font-bold text-sm flex items-center text-primary">Keyword</div>
                  {repeatedKey.split('').map((char, i) => (
                    <div key={`k-${i}`} className={`w-8 h-8 flex items-center justify-center border font-mono text-sm ${char !== ' ' ? 'bg-primary/10 text-primary font-bold' : 'bg-transparent border-transparent'}`}>
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Visualization Section */}
      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Step-by-Step Visualization</CardTitle>
            <CardDescription>
              Mathematical calculation block. (A=0, B=1, ... Z=25)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px] text-center">Original</TableHead>
                    <TableHead className="text-center">Char Code</TableHead>
                    <TableHead>Mathematical Formula</TableHead>
                    <TableHead className="text-center">Result Code</TableHead>
                    <TableHead className="text-center w-[100px]">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, index) => (
                    <TableRow key={index} className={!step.isAlphabetic ? 'opacity-50' : ''}>
                      <TableCell className="text-center font-mono font-bold text-lg uppercase">
                        {step.originalChar}
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {step.isAlphabetic ? step.originalCode : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {step.formula}
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {step.isAlphabetic ? step.shiftedCode : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-lg text-primary uppercase">
                        {step.newChar}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
