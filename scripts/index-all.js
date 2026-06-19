import { indexAllFiles } from '../search/indexer.js';

console.log('Starting full re-indexing of all files in uploads...');
indexAllFiles()
  .then(() => {
    console.log('Full re-indexing completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during re-indexing:', err);
    process.exit(1);
  });
