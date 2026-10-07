import {build} from 'esbuild';
// Browser only creates requests. All cryptographic verification runs on the server
// with the complete SDK. Keep server-only WASM verifiers out of the browser build.
await build({entryPoints:['frontend/passport-sdk.js'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/passport-sdk.js',legalComments:'external',plugins:[{name:'server-verification-only',setup(b){b.onResolve({filter:/^@aztec\/bb\.js/},args=>({path:args.path,namespace:'server-only'}));b.onLoad({filter:/.*/,namespace:'server-only'},()=>({contents:'export class Barretenberg { static async new() { throw new Error("Passport proof verification requires the New Tibet backend."); } } export class UltraHonkBackend {}',loader:'js'}));}}]});
