import { retryFailed } from '../search/indexer.js';

console.log('Starting retry of failed indexing attempts...');
retryFailed()
  .then(() => {
    console.log('Failed indexing retry completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during retrying failed indexing:', err);
    process.exit(1);
  });
