# מילים

A Hebrew word hive: seven letters, one required in the center, and a new puzzle each day. Other languages can be added later as an alphabet plus a puzzle list.

```bash
npm install
npm run dev
```

`npm test` checks scoring, Hebrew final letters, and the puzzle bank. `npm run puzzles` rebuilds `src/data/he-puzzles.ts`.

The word list is a frequency-filtered subset of [Hspell](http://hspell.ivrix.org.il/) by Nadav Har'El and Dan Kenigsberg, via [eyaler/hebrew_wordlists](https://github.com/eyaler/hebrew_wordlists). Those lists are AGPL-3.0, and so is this project. The source file is downloaded to `data/cc100.csv` when puzzles are rebuilt and is not committed.
