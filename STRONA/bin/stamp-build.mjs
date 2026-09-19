// Zapisuje moment zbudowania do public/.build-stamp.
//
// Czyta go `api/trackrecord-beat.js`, zeby wiedziec, czy strona nie stoi zbyt
// dlugo bez deployu. Stempel jest lepszy niz wpis w bazie, bo zeruje sie SAM:
// po kazdym buildzie jest nowy, wiec nie ma stanu, ktory moglby sie rozjechac
// z rzeczywistoscia.
//
// Leci w `public/`, a nie w `dist/`, bo Vite kopiuje public 1:1 i plik jest
// wtedy osiagalny pod https://forexpassing.com/.build-stamp.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TU = dirname(fileURLToPath(import.meta.url));
const CEL = resolve(TU, '../public/.build-stamp');

mkdirSync(dirname(CEL), { recursive: true });
writeFileSync(CEL, new Date().toISOString() + '\n');
console.log('build-stamp:', new Date().toISOString());
