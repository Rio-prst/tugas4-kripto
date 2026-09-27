# Panduan Implementasi: RSA (Rivest-Shamir-Adleman)

## 1. Konsep Dasar
RSA adalah algoritma **Kriptografi Kunci Publik / Asimetris**[cite: 2, 5]. Algoritma ini menggunakan sepasang kunci: **Public Key** untuk enkripsi dan **Private Key** untuk dekripsi[cite: 2, 5]. Keamanannya didasarkan pada tingkat kesulitan faktorisasi dua bilangan prima berukuran besar[cite: 2, 5].

## 2. Pembentukan Kunci (Key Generation)
1. Pilih 2 bilangan prima $p$ dan $q$.
2. Hitung $n = p \times q$ (Nilai $n$ adalah modul)[cite: 2, 5].
3. Hitung nilai Totient Euler: $\phi(n) = (p - 1) \times (q - 1)$.
4. Pilih kunci publik $e$ dengan syarat $1 < e < \phi(n)$ dan $\gcd(e, \phi(n)) = 1$ (biasanya menggunakan 65537 atau 3 untuk angka kecil).
5. Hitung kunci privat $d$ sehingga:
   $$d \equiv e^{-1} \pmod{\phi(n)} \quad \text{atau} \quad (d \times e) \bmod \phi(n) = 1$$
- **Public Key:** $(e, n)$[cite: 2, 5]
- **Private Key:** $(d, n)$[cite: 2, 5]

## 3. Rumus Matematis Enkripsi & Dekripsi
### Enkripsi
$$C = P^e \bmod n$$
[cite: 1]

### Dekripsi
$$P = C^d \bmod n$$

## 4. Contoh Perhitungan Manual (Sederhana)
- **Prima:** $p = 61$, $q = 53$
- $n = 61 \times 53 = 3233$
- $\phi(n) = (61 - 1) \times (53 - 1) = 60 \times 52 = 3120$
- **Pilih $e$:** $17$ (memenuhi $\gcd(17, 3120) = 1$)
- **Hitung $d$:** $d = 2753$ (karena $(2753 \times 17) \bmod 3120 = 1$)

### Proses Enkripsi karakter $P = 65$ ('A'):
$$C = 65^{17} \bmod 3233 = 2790$$

### Proses Dekripsi $C = 2790$:
$$P = 2790^{2753} \bmod 3233 = 65 \rightarrow \text{'A'}$$

## 5. Instruksi Pengembangan untuk AI Agent (Sangat Penting)
1. **Penanganan Chunking/Karakter:**
   - Karena $P$ harus lebih kecil dari $n$ ($P < n$), lakukan pemrosesan **karakter per karakter** (konversi ke kode ASCII/Unicode $P$) atau gunakan blok angka kecil.
2. **Eksponensial Modular:**
   - Wajib menggunakan algoritma *Modular Exponentiation* (misalnya metode *Square-and-Multiply* atau `BigInt` pada JavaScript / `pow(base, exp, mod)` di Python) untuk mencegah *integer overflow*.
3. **Format Output:**
   - Hasil enkripsi berupa array angka cipher $[C_1, C_2, C_3, \dots]$, gabungkan menggunakan pemisah koma atau format JSON string agar siap dikirimkan ke modul/menu algoritma berikutnya.