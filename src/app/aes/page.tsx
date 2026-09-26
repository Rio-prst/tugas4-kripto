'use client';

import { useState } from 'react';
import { processAES, AesResult } from '@/utils/aesCipher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lock, Unlock, ArrowDown } from 'lucide-react';

export default function AesCipherPage() {
  const [inputText, setInputText] = useState('');
  const [shiftKey, setShiftKey] = useState('');
  const [result, setResult] = useState<AesResult | null>(null);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    if (!inputText || !shiftKey) {
      setResult(null);
      return;
    }
    const res = processAES(inputText, shiftKey, selectedMode);
    setResult(res);
  };

  const renderMatrix = (matrix: string[][], label: string) => (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
      <div className="grid grid-cols-4 gap-1 p-2 bg-muted rounded-md border">
        {matrix.map((row, rIdx) => 
          row.map((cell, cIdx) => (
            <div 
              key={`${rIdx}-${cIdx}`} 
              className="w-10 h-10 flex items-center justify-center bg-background border rounded font-mono text-sm shadow-sm"
              title={`Row ${rIdx}, Col ${cIdx}`}
            >
              {cell}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AES (Advanced Encryption Standard)</h1>
        <p className="text-muted-foreground">
          A symmetric block cipher used worldwide. Operating on 4x4 matrices of bytes (State Matrix).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Enter your text and secret key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Text</Label>
              <Textarea
                id="input-text"
                placeholder="Enter text..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift-key">Secret Password</Label>
              <Input
                id="shift-key"
                type="password"
                placeholder="SuperSecretKey123"
                value={shiftKey}
                onChange={(e) => setShiftKey(e.target.value)}
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={() => handleProcess('encrypt')}
                disabled={!inputText || !shiftKey}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="w-4 h-4 mr-2" />
                Encrypt
              </Button>
              <Button 
                onClick={() => handleProcess('decrypt')}
                variant="secondary"
                disabled={!inputText || !shiftKey}
                className="flex-1"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Decrypt
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
            <CardDescription>
              {mode === 'encrypt' ? 'Base64 Encoded Ciphertext' : 'Decrypted Plaintext'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex items-center justify-center border">
              {result ? (
                <p className={`text-lg font-mono text-center break-all ${result.resultText.includes('ERROR') ? 'text-destructive' : 'text-foreground'}`}>
                  {result.resultText}
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center">
                  <ArrowRight className="w-5 h-5 mr-2 animate-pulse" />
                  Awaiting input & key
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Real Step-by-Step Matrix (Round 1)</CardTitle>
            <CardDescription>
              Unlike classical ciphers, AES works on 128-bit blocks (16 bytes) processed in a 4x4 matrix through multiple rounds. This shows the EXACT mathematical outputs of the first round.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {result.steps.map((step) => (
              <div key={step.id} className="flex flex-col space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{step.description}</p>
                  
                  {step.extraInfo && (
                    <div className="mt-4 p-3 bg-primary/10 text-primary text-sm rounded border border-primary/20">
                      {step.extraInfo}
                    </div>
                  )}

                  {(step.matrixBefore || step.matrixAfter) && (
                    <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-6">
                      {step.matrixBefore && renderMatrix(step.matrixBefore, step.matrixKey ? 'State Matrix' : 'Before')}
                      
                      {step.matrixKey && (
                        <>
                          <div className="flex flex-col items-center text-muted-foreground my-2 md:my-0">
                            <span className="text-2xl font-bold">⊕</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">XOR</span>
                          </div>
                          {renderMatrix(step.matrixKey, 'Key Matrix')}
                        </>
                      )}

                      {step.matrixBefore && step.matrixAfter && (
                        <div className="flex flex-col items-center text-muted-foreground my-2 md:my-0 md:ml-4">
                          <ArrowRight className="hidden md:block w-8 h-8" />
                          <ArrowDown className="md:hidden w-6 h-6" />
                          <span className="text-[10px] uppercase font-bold tracking-widest mt-1">Result</span>
                        </div>
                      )}

                      {step.matrixAfter && renderMatrix(step.matrixAfter, step.matrixKey ? 'Initial Round Matrix' : 'After')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
