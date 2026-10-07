import {ZKPassport, NullifierType} from '@zkpassport/sdk';
import QRCode from 'qrcode';
export {ZKPassport, NullifierType};
export const qr = url => QRCode.toDataURL(url,{width:256,margin:2,errorCorrectionLevel:'M'});
