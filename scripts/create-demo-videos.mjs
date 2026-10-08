// macOS authoring helper: generated stills + synthesized narration, never a live face check.
// Usage: FFMPEG_BIN=/path/to/ffmpeg node scripts/create-demo-videos.mjs
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const ffmpeg=process.env.FFMPEG_BIN||'ffmpeg';
const scratch=mkdtempSync(join(tmpdir(),'new-tibet-video-'));
const assets=resolve('public/assets/demo');
const font='/System/Library/Fonts/Supplemental/Arial.ttf';
try{
 for(const book of ['green','blue']){
  const label=book==='green'?'Green Book':'Blue Book';
  const statement=`Hello, my name is Tenzin Dolma. I am applying for New Tibet with my ${label}. My sample verification code is five, three, four, two, one, six. This is a fictional application for demonstration purposes.`;
  const audio=join(scratch,book+'.aiff');
  execFileSync('/usr/bin/say',['-v','Samantha','-r','150','-o',audio,statement]);
  const scenes=[['tenzin-dolma.jpg',5,'Tenzin Dolma | Fictional applicant'],[book+'-identity.jpg',5,label+' | Sample document'],[book+'-challenge.jpg',8,'Sample verification code: 534216']];
  const inputs=scenes.flatMap(([image])=>['-i',join(assets,image)]);
  const filters=scenes.map(([,seconds,caption],index)=>{
   const code=index===2?`,drawtext=fontfile='${font}':text='534216':fontsize=32:fontcolor=0x23304a:x=w*${book==='blue'?'.83':'.85'}-tw/2:y=h*.55-th/2`:'';
   return `[${index}:v]scale=720:540:force_original_aspect_ratio=decrease,pad=720:540:(ow-iw)/2:(oh-ih)/2:color=0xf1f2f4,setsar=1,zoompan=z='min(zoom+0.00015,1.025)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${seconds*30}:s=720x540:fps=30${code},drawbox=x=0:y=0:w=iw:h=38:color=0x1b2a5b@.9:t=fill,drawtext=fontfile='${font}':text='NEW TIBET | NARRATED DEMO':fontsize=14:fontcolor=white:x=20:y=13,drawbox=x=0:y=ih-42:w=iw:h=42:color=black@.65:t=fill,drawtext=fontfile='${font}':text='${caption.replaceAll(':','\\:')}':fontsize=17:fontcolor=white:x=(w-tw)/2:y=h-29,format=yuv420p[v${index}]`;
  });
  filters.push('[v0][v1][v2]concat=n=3:v=1:a=0[video]','[3:a]apad[audio]');
  const output=join(assets,book==='green'?'sample-video.mp4':'sample-video-blue.mp4');
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...inputs,'-i',audio,'-filter_complex',filters.join(';'),'-map','[video]','-map','[audio]','-t','18','-c:v','libx264','-preset','medium','-crf','24','-c:a','aac','-b:a','96k','-movflags','+faststart',output],{stdio:'inherit'});
  writeFileSync(join(assets,'sample-video-'+book+'.vtt'),`WEBVTT\n\n00:00.000 --> 00:03.100\nHello, my name is Tenzin Dolma.\n\n00:03.100 --> 00:06.700\nI am applying for New Tibet with my ${label}.\n\n00:06.700 --> 00:12.600\nMy sample verification code is 5, 3, 4, 2, 1, 6.\n\n00:12.600 --> 00:18.000\nThis is a fictional application for demonstration purposes.\n`);
  console.log(label+': narrated 18-second fictional sample video saved.');
 }
}finally{rmSync(scratch,{recursive:true,force:true});}
