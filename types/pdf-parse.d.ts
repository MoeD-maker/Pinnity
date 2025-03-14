/**
 * Type declarations for pdf-parse module
 * This provides TypeScript typings for the package
 */

declare module 'pdf-parse' {
  /**
   * Result of parsing a PDF file
   */
  interface PDFParseResult {
    /**
     * Number of pages in the PDF
     */
    numpages: number;
    
    /**
     * Number of rendered pages
     */
    numrender: number;
    
    /**
     * PDF info dictionary
     */
    info: {
      PDFFormatVersion?: string;
      IsAcroFormPresent?: boolean;
      IsXFAPresent?: boolean;
      IsCollectionPresent?: boolean;
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
      Trapped?: string;
      [key: string]: any;
    };
    
    /**
     * PDF metadata
     */
    metadata: {
      [key: string]: any;
    } | null;
    
    /**
     * PDF text content
     */
    text: string;
    
    /**
     * PDF version
     */
    version: string;
  }

  /**
   * Options for PDF parsing
   */
  interface PDFParseOptions {
    /**
     * Page number to start reading from
     */
    pagerender?: (pageData: any) => Promise<string>;
    
    /**
     * Maximum number of pages to parse
     */
    max?: number;
    
    /**
     * Text output format. If true, line breaks will be in Unix style \n
     */
    unix?: boolean;
    
    /**
     * Other custom options
     */
    [key: string]: any;
  }

  /**
   * Parse PDF from file path
   * @param dataBuffer Buffer containing PDF data
   * @param options PDF parsing options
   * @returns Promise resolving to parsing result
   */
  function parse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFParseResult>;

  export = parse;
}