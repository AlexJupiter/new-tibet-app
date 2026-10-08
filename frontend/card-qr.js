import QRCode from 'qrcode';
export const cardQR=value=>QRCode.toDataURL(value,{errorCorrectionLevel:'M',margin:4,width:512,color:{dark:'#1b2a5b',light:'#ffffff'}});
