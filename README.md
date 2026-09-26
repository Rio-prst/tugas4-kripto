This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Input validation rules

The cipher utilities reject invalid input instead of substituting a fallback.
This document explains *why* each rule exists, because in every case the
alternative was a silent failure that looked like a successful run.

### RSA

RSA is implemented per its mathematical requirements:

| Requirement | Consequence when violated |
| --- | --- |
| `p` and `q` are distinct primes | A composite factor makes `n` trivially factorable |
| `n = p·q`, `φ = (p−1)(q−1)` | — |
| `1 < e < φ` | `e` outside this range has no inverse |
| `gcd(e, φ) = 1` | **No private key exists at all** |
| `d = e⁻¹ mod φ` | Computed with the extended Euclidean algorithm |
| `0 ≤ m < n` | Required, because RSA operates on `Z_n` |

Two of these are worth calling out.

**A non-coprime `e` means no key pair can be generated.** The congruence
`e·d ≡ 1 (mod φ)` has no solution when `gcd(e, φ) > 1`. An earlier version of
this code searched for `d` and, after 10000 failed attempts, fell back to a
hardcoded `d = 103`. That number is in fact the correct inverse for the default
`p = 11, q = 13, e = 7`, which is why the bug went unnoticed: for any `e`
sharing a factor with `φ`, the UI displayed a private key that mathematically
cannot exist. The app now reports that no private key exists.

**`m ≥ n` cannot be encrypted as a single block.** Since one character is
encrypted as one block, `n` must exceed the character code. With the default
`p = 11, q = 13` we get `n = 143`, `φ = 120`, `d = 103` — small enough to verify
by hand, and large enough for every ASCII character (code 0–127). The
super-encryption page uses `p = 17, q = 19` (`n = 323`) instead, because its
input is LFSR output, which is a raw byte in `0–255` rather than typed text.

Note that these primes are chosen for legibility, not security. A 143 modulus is
breakable by a child; real deployments use at least 2048 bits.

### LFSR

The all-zero seed is rejected. The zero state is *absorbing*: every new bit
becomes `0 ⊕ 0 = 0`, so the register can never leave it, the keystream stays all
zeros, and "encryption" would return the plaintext unchanged.

The page also reports the register period (`2^L − 1` for a maximal-length
configuration). With a 4-bit seed and the `(L−1, L−2)` tap, all 15 states are
visited, which confirms the register is running at full length.

Encryption and decryption are the same operation here, since XOR with a
keystream is its own inverse. The `mode` parameter that used to be threaded
through the function had no effect and was removed.

### Caesar and Vigenère

An empty Vigenère key used to become `"A"`, which shifts by zero, so encrypting
with a blank key returned the plaintext and looked like a clean round trip. A
non-numeric Caesar shift used to become `0`, producing the identity cipher for
the same reason. Both are now rejected.

### AES

AES only defines key sizes of 128, 192, and 256 bits, so keys must be 16, 24, or
32 bytes. The key is measured in bytes rather than string characters, so a key
containing non-ASCII characters is not silently accepted at the wrong size.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
