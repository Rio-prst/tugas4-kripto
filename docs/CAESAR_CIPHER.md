# Panduan Implementasi: Caesar Cipher

## 1. Konsep Dasar
Caesar Cipher adalah algoritma kriptografi klasik berbasis **Substitusi Monoalfabetik**. Cara kerjanya adalah menggeser setiap karakter pada *plaintext* sejauh nilai kunci (*shift/key*) tertentu di dalam urutan alfabet.

## 2. Pemetaan & Pemodelan Karakter
- Alfabet dipetakan ke dalam angka berbasis **0 hingga 25**:
  $A=0, B=1, C=2, \dots, Z=25$.
- Penanganan huruf kapital/kecil (*case-sensitivity*) wajib dipertahankan.
- Karakter non-alfabet (spasi, angka, simbol) tidak diubah (diabaikan atau diteruskan langsung ke *output*).

## 3. Rumus Matematis
### Enkripsi
$$C_i = (P_i + K) \bmod 26$$
*Keterangan:*
- $P_i$: Indeks angka karakter plaintext ke-$i$.
- $K$: Nilai pergeseran (*key/shift*).
- $C_i$: Indeks angka karakter ciphertext ke-$i$.

### Dekripsi
$$P_i = (C_i - K) \bmod 26$$
*Catatan Implementasi:*
Jika hasil $(C_i - K) < 0$, tambahkan $26$ sebelum di-modulo agar hasilnya bernilai positif:
$$P_i = ((C_i - K) \bmod 26 + 26) \bmod 26$$

## 4. Contoh Perhitungan Manual
- **Plaintext ($P$):** `KAZU`
- **Key ($K$):** `3`

### Enkripsi:
1. `K` (10): $(10 + 3) \bmod 26 = 13 \rightarrow$ **N**
2. `A` (0): $(0 + 3) \bmod 26 = 3 \rightarrow$ **D**
3. `Z` (25): $(25 + 3) \bmod 26 = 28 \bmod 26 = 2 \rightarrow$ **C**
4. `U` (20): $(20 + 3) \bmod 26 = 23 \rightarrow$ **X**
- **Ciphertext:** `NDCX`

## 5. Instruksi Pengembangan untuk AI Agent
1. Buat fungsi `encryptCaesar(plaintext: string, shift: number): string`.
2. Buat fungsi `decryptCaesar(ciphertext: string, shift: number): string`.
3. Sediakan return berupa *step-by-step trace log* (array dari objek langkah per karakter) agar bisa ditampilkan pada UI logs/visualisasi aplikasi.