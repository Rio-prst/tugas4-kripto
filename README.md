# Cryptography Application

Aplikasi berbasis web untuk melakukan **enkripsi dan dekripsi** menggunakan beberapa algoritma kriptografi klasik dan modern.

Project ini dibuat sebagai tugas kelompok pada mata kuliah Kriptografi untuk memahami cara kerja algoritma kriptografi melalui implementasi dan visualisasi proses enkripsi maupun dekripsi.

---

## Deskripsi

Aplikasi ini menyediakan beberapa algoritma kriptografi yang dapat digunakan untuk melakukan proses enkripsi dan dekripsi.

Selain menampilkan hasil akhir, aplikasi juga menampilkan **proses atau langkah-langkah algoritma** sehingga pengguna dapat memahami bagaimana plaintext diproses hingga menjadi ciphertext, maupun sebaliknya.

Aplikasi terdiri dari **5 menu utama**:

1. Caesar Cipher
2. Vigenère Cipher
3. Algoritma Kriptografi Modern 1
4. Algoritma Kriptografi Modern 2
5. Super Encryption

---

## Fitur

* 🔒 Enkripsi teks
* 🔓 Dekripsi teks
* 📊 Visualisasi proses enkripsi
* 📊 Visualisasi proses dekripsi
* 🔑 Input key sesuai algoritma
* 🧮 Menampilkan perhitungan atau tahapan algoritma
* 🔗 Super encryption menggunakan empat algoritma
* 📋 Menampilkan hasil setiap tahapan proses

---

# Algoritma

## 1. Caesar Cipher

Caesar Cipher merupakan salah satu algoritma kriptografi klasik yang menggunakan teknik **substitusi** dengan menggeser setiap karakter pada plaintext berdasarkan nilai pergeseran tertentu.

Contoh:

```text
Plaintext  : HELLO
Shift      : 3
Ciphertext : KHOOR
```

Proses:

```text
H → K
E → H
L → O
L → O
O → R
```

Aplikasi akan menampilkan proses pergeseran karakter selama enkripsi maupun dekripsi.

---

## 2. Vigenère Cipher

Vigenère Cipher merupakan algoritma kriptografi klasik yang menggunakan **keyword** untuk menentukan pergeseran setiap karakter plaintext.

Contoh:

```text
Plaintext : ATTACK
Key       : LEMONL
```

Setiap karakter plaintext akan diproses menggunakan karakter key yang bersesuaian.

Aplikasi akan menampilkan proses perhitungan setiap karakter sehingga proses enkripsi dan dekripsi dapat dipahami secara visual.

---

## 3. Algoritma Kriptografi Modern 1

> **Akan ditentukan.**

Algoritma, metode, dan proses implementasi akan ditambahkan setelah algoritma ditentukan.

---

## 4. Algoritma Kriptografi Modern 2

> **Akan ditentukan.**

Algoritma, metode, dan proses implementasi akan ditambahkan setelah algoritma ditentukan.

---

# 5. Super Encryption

Super Encryption merupakan proses enkripsi yang menggabungkan **empat algoritma kriptografi** secara berurutan.

Proses enkripsi:

```text
                 Plaintext
                     │
                     ▼
              Caesar Cipher
                     │
                     ▼
             Vigenère Cipher
                     │
                     ▼
            Modern Algorithm 1
                     │
                     ▼
            Modern Algorithm 2
                     │
                     ▼
                 Ciphertext
```

Sedangkan proses dekripsi dilakukan dengan urutan algoritma yang berlawanan:

```text
                 Ciphertext
                     │
                     ▼
          Decrypt Modern Algorithm 2
                     │
                     ▼
          Decrypt Modern Algorithm 1
                     │
                     ▼
            Decrypt Vigenère
                     │
                     ▼
             Decrypt Caesar
                     │
                     ▼
                  Plaintext
```

Aplikasi akan menampilkan hasil dari setiap tahapan sehingga pengguna dapat melihat bagaimana data berubah setelah melewati masing-masing algoritma.

---

# Visualisasi Proses

Salah satu fitur utama aplikasi adalah menampilkan proses algoritma secara bertahap.

Contoh proses Caesar Cipher:

```text
Input
HELLO

        ↓

H = 7
7 + 3 = 10
10 = K

        ↓

E = 4
4 + 3 = 7
7 = H

        ↓

L = 11
11 + 3 = 14
14 = O

        ↓

Output
KHOOR
```

Proses tersebut nantinya dapat ditampilkan dalam bentuk tabel atau visualisasi interaktif pada aplikasi.

---

# Struktur Menu

```text
Cryptography Application
│
├── 1. Caesar Cipher
│   ├── Encryption
│   └── Decryption
│
├── 2. Vigenère Cipher
│   ├── Encryption
│   └── Decryption
│
├── 3. Modern Algorithm 1
│   ├── Encryption
│   └── Decryption
│
├── 4. Modern Algorithm 2
│   ├── Encryption
│   └── Decryption
│
└── 5. Super Encryption
    ├── Encryption
    └── Decryption
```

---

# Tujuan

Project ini bertujuan untuk:

* Memahami konsep dasar kriptografi.
* Mengimplementasikan algoritma kriptografi klasik.
* Mengimplementasikan algoritma kriptografi modern.
* Memahami proses enkripsi dan dekripsi.
* Memvisualisasikan tahapan algoritma kriptografi.
* Menggabungkan beberapa algoritma menjadi sebuah proses super encryption.
* Menerapkan konsep kriptografi dalam sebuah aplikasi.

---

## 📚 Catatan

Project ini dibuat untuk keperluan **pembelajaran dan tugas akademik** pada mata kuliah Kriptografi.
