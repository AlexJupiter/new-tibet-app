import {GoogleStore} from './google.mjs';
if(!process.env.GOOGLE_SHEET_ID||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('Set Google credentials and sheet ID first.');
await new GoogleStore(process.env).initialize();console.log('Applications header initialized.');
