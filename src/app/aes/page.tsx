'use client';

import { useState } from 'react';
import { processAES, AesResult } from '@/utils/aesCipher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lock, Unlock, ArrowDown, TriangleAlert, Eye, EyeOff } from 'lucide-react';
import { ValidationNotice } from '@/components/ValidationNotice';
import { ResultStatus } from '@/components/ResultStatus';
import { CopyButton } from '@/components/CopyButton';
import { useCipherRun } from '@/hooks/useCipherRun';
import { CipherError } from '@/lib/cipherError';
import { checkInputLength } from '@/lib/cipherLimits';

export default function AesCipherPage() {
  const [inputText, setInputText] = useState('');
  const [shiftKey, setShiftKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { result, error, run, mode, setMode } = useCipherRun<AesResult>();

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    run(() => {
      if (!inputText) {
        throw new CipherError('EMPTY_INPUT');
      }
      if (!shiftKey) {
        throw new CipherError('AES_KEY_LENGTH', 'No key was entered.');
      }
      checkInputLength(inputText.length, 'aes');
      return processAES(inputText, shiftKey, selectedMode);
    });
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
              <Label htmlFor="shift-key">Secret Key</Label>
              <div className="flex space-x-2">
                <Input
                  id="shift-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="SuperSecretKey123"
                  value={shiftKey}
                  onChange={(e) => setShiftKey(e.target.value)}
                  className="flex-1"
                />
                {/* The page prints the derived round keys, so being unable to
                    read the key that produced them is a dead end. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey((v) => !v)}
                  aria-pressed={showKey}
                >
                  {showKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  <span className="sr-only">{showKey ? 'Hide key' : 'Show key'}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Any text. It is stretched into 128, 192, or 256 bits, so there is no
                password strength to judge here.
              </p>
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

            <ValidationNotice info={error} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
            <CardDescription>
              {mode === 'encrypt' ? 'Hexadecimal Ciphertext (ECB)' : 'Decrypted Plaintext'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex flex-col items-center justify-center gap-4 border">
              {result ? (
                <>
                  <p className="text-lg font-mono text-center break-all text-foreground">
                    {result.resultText}
                  </p>
                  <CopyButton value={result.resultText} label="Copy hex" />
                </>
              ) : error ? (
                <p className="text-muted-foreground flex items-center">
                  <TriangleAlert aria-hidden="true" className="w-5 h-5 mr-2" />
                  No result. See the message on the left.
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center">
                  <ArrowRight aria-hidden="true" className="w-5 h-5 mr-2 animate-pulse" />
                  Awaiting input &amp; key
                </p>
              )}
            </div>
            <ResultStatus hasResult={Boolean(result)} error={error} mode={mode} noun="hex ciphertext" />
          </CardContent>
        </Card>
      </div>

      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Real Step-by-Step Matrix ({result.rounds} rounds)</CardTitle>
            <CardDescription>
              AES works on 16-byte blocks through {result.rounds} rounds. Every matrix below is the real
              output of that operation, computed by an implementation checked against the known-answer
              vectors in FIPS-197. The trace follows the first block; all {result.blockCount} block
              {result.blockCount === 1 ? '' : 's'} are listed underneath.
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
                      {step.matrixBefore && renderMatrix(step.matrixBefore, 'Before')}

                      {step.matrixKey && (
                        <>
                          <div className="flex flex-col items-center text-muted-foreground my-2 md:my-0">
                            <span className="text-2xl font-bold">⊕</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">XOR</span>
                          </div>
                          {renderMatrix(step.matrixKey, 'Round key')}
                        </>
                      )}

                      {step.matrixBefore && step.matrixAfter && (
                        <div className="flex flex-col items-center text-muted-foreground my-2 md:my-0 md:ml-4">
                          <ArrowRight className="hidden md:block w-8 h-8" />
                          <ArrowDown className="md:hidden w-6 h-6" />
                          <span className="text-[10px] uppercase font-bold tracking-widest mt-1">Result</span>
                        </div>
                      )}

                      {step.matrixAfter && renderMatrix(step.matrixAfter, 'After')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result && result.blockCount > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All blocks</CardTitle>
            <CardDescription>
              Each block is encrypted independently, which is what ECB means. The same plaintext block
              therefore always produces the same ciphertext block under the same key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.blocks.map((block) => (
                <div
                  key={block.index}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/30 rounded-md border text-sm"
                >
                  <span className="font-bold shrink-0 w-24">
                    {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'} {block.index}
                  </span>
                  <code className="font-mono text-xs break-all">{block.inputHex}</code>
                  <ArrowRight className="hidden sm:block w-4 h-4 shrink-0 text-muted-foreground" />
                  <code className="font-mono text-xs break-all">{block.outputHex}</code>
                  {block.detailed && (
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary shrink-0">
                      traced above
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
