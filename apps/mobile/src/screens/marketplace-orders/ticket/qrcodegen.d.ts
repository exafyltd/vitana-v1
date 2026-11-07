/** Types for the vendored Nayuki QR Code generator (qrcodegen.js): the parts the ticket QR uses. */
export declare namespace qrcodegen {
  class QrCode {
    static encodeText(text: string, ecl: QrCode.Ecc): QrCode;
    readonly size: number;
    getModule(x: number, y: number): boolean;
  }
  namespace QrCode {
    class Ecc {
      static readonly LOW: Ecc;
      static readonly MEDIUM: Ecc;
      static readonly QUARTILE: Ecc;
      static readonly HIGH: Ecc;
    }
  }
}
