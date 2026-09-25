'use client';

import { useState } from 'react';
import { processCaesar } from '@/utils/caesarCipher';
import { CipherResult } from '@/types/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Lock, Unlock } from 'lucide-react';

export default function CaesarCipherPage() {
  const [inputText, setInputText] = useState('');
  const [shiftKey, setShiftKey] = useState<string>('3');
  const [result, setResult] = useState<CipherResult | null>(null);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    if (!inputText) {
      setResult(null);
      return;
    }
    const numericShift = parseInt(shiftKey) || 0;
    const res = processCaesar(inputText, numericShift, selectedMode);
    setResult(res);
  };

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Caesar Cipher</h1>
        <p className="text-muted-foreground">
          A substitution cipher where each letter in the plaintext is shifted a certain number of places down the alphabet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Enter your text and key to see the magic happen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Text (Plaintext or Ciphertext)</Label>
              <Textarea
                id="input-text"
                placeholder="Enter text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift-key">Shift Key (Number)</Label>
              <Input
                id="shift-key"
                type="number"
                value={shiftKey}
                onChange={(e) => setShiftKey(e.target.value)}
                className="max-w-xs"
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
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex items-center justify-center border">
              {result ? (
                <p className="text-2xl font-mono text-center break-all text-foreground">
                  {result.resultText}
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center">
                  <ArrowRight className="w-5 h-5 mr-2 animate-pulse" />
                  Awaiting input
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alphabet Mapping Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Alphabet Key Mapping</CardTitle>
          <CardDescription>How the entire alphabet is shifted based on your key ({parseInt(shiftKey) || 0}).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <div className="flex flex-col gap-2 min-w-max">
              <div className="flex">
                <div className="w-24 font-bold text-sm flex items-center">Plaintext</div>
                {Array.from({ length: 26 }).map((_, i) => (
                  <div key={`p-${i}`} className="w-8 h-8 flex items-center justify-center border bg-muted/30 font-mono text-sm">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div className="flex">
                <div className="w-24 font-bold text-sm flex items-center">Ciphertext</div>
                {Array.from({ length: 26 }).map((_, i) => (
                  <div key={`c-${i}`} className="w-8 h-8 flex items-center justify-center border bg-primary/10 font-mono text-sm font-bold text-primary">
                    {String.fromCharCode(65 + ((i + ((parseInt(shiftKey) || 0) % 26) + 26) % 26))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Visualization Section */}
      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Step-by-Step Visualization</CardTitle>
            <CardDescription>
              Mathematical calculation for each character block. (A=0, B=1, ... Z=25)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px] text-center">Original</TableHead>
                    <TableHead className="text-center">Code (0-25)</TableHead>
                    <TableHead>Mathematical Formula</TableHead>
                    <TableHead className="text-center">Shifted Code</TableHead>
                    <TableHead className="text-center w-[100px]">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, index) => (
                    <TableRow key={index} className={!step.isAlphabetic ? 'opacity-50' : ''}>
                      <TableCell className="text-center font-mono font-bold text-lg">
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
                      <TableCell className="text-center font-mono font-bold text-lg text-primary">
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
