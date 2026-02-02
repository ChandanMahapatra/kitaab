import MarkdownIt from 'markdown-it';

const mdParser = new MarkdownIt();

// Dynamically import html2pdf.js to avoid SSR issues
const loadHtml2pdf = async () => {
    const html2pdf = await import('html2pdf.js');
    return html2pdf.default || html2pdf;
};

export const exportToMarkdown = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase() || 'draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportToHTML = (title: string, content: string) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Lato', system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Lato', sans-serif; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: #222; }
        h1 { font-size: 2em; border-bottom: 2px solid #546e7a; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        p { margin: 0 0 1em 0; }
        pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; border-left: 3px solid #546e7a; }
        code { font-family: 'IBM Plex Mono', monospace; background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #546e7a; margin: 0 0 1em 0; padding: 0.5em 1rem; background: #f9f9f9; color: #555; font-style: italic; }
        ul, ol { margin: 0 0 1em 0; padding-left: 2em; }
        li { margin: 0.25em 0; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        a { color: #546e7a; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
        strong { font-weight: 700; }
        em { font-style: italic; }
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      ${mdParser.render(content)}
    </body>
    </html>
  `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase() || 'draft'}.html`;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportToPDF = async (title: string, content: string) => {
    // Create a styled container for PDF rendering - Black & White
    const container = document.createElement('div');
    container.style.cssText = `
        min-height: 297mm;
        padding: 15mm;
        background: white;
        color: #000;
        font-family: 'Lato', system-ui, -apple-system, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        box-sizing: border-box;
        max-width: 100%;
    `;
    
    // Add comprehensive markdown styles - Black & White only
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        h1, h2, h3, h4, h5, h6 { 
            font-family: 'Lato', sans-serif; 
            font-weight: 700; 
            margin-top: 1.2em; 
            margin-bottom: 0.5em; 
            color: #000; 
            page-break-after: avoid;
        }
        h1 { font-size: 24pt; border-bottom: 2px solid #000; padding-bottom: 0.3em; margin-top: 0; }
        h2 { font-size: 18pt; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
        h3 { font-size: 14pt; }
        h4 { font-size: 12pt; }
        h5 { font-size: 11pt; }
        h6 { font-size: 10pt; color: #444; }
        p { margin: 0 0 0.8em 0; text-align: justify; color: #000; }
        pre { 
            background: #f5f5f5; 
            padding: 0.8em; 
            border-radius: 4px; 
            border-left: 3px solid #444;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 9pt;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 0.8em 0;
            page-break-inside: avoid;
            color: #000;
        }
        code { 
            font-family: 'IBM Plex Mono', monospace; 
            background: #f5f5f5; 
            padding: 0.15em 0.3em; 
            border-radius: 3px; 
            font-size: 0.9em; 
            color: #000;
        }
        pre code { background: none; padding: 0; }
        blockquote { 
            border-left: 4px solid #444; 
            margin: 0.8em 0; 
            padding: 0.5em 1em; 
            background: #f9f9f9; 
            color: #000; 
            font-style: italic;
            page-break-inside: avoid;
        }
        ul, ol { 
            margin: 0.5em 0;
            margin-left: 1.5em;
            padding-left: 0;
            color: #000;
            list-style: none;  /* Remove default browser markers */
        }
        li {
            position: relative;
            padding-left: 1.2em;  /* Space for custom marker */
            margin: 0.2em 0;
            line-height: 1.6;
        }
        /* Unordered list bullets */
        ul li::before {
            content: "•";
            position: absolute;
            left: 0;
            top: 0;
            line-height: 1.6;
        }
        /* Ordered list numbers */
        ol {
            counter-reset: item;
        }
        ol li {
            counter-increment: item;
        }
        ol li::before {
            content: counter(item) ".";
            position: absolute;
            left: 0;
            top: 0;
            line-height: 1.6;
        }
        /* Nested lists */
        ul ul, ol ol, ul ol, ol ul { 
            margin: 0.2em 0;
            margin-left: 1.5em;
        }
        ul ul li::before {
            content: "○";  /* Circle for nested unordered */
        }
        ol ol {
            counter-reset: subitem;
        }
        ol ol li {
            counter-increment: subitem;
        }
        ol ol li::before {
            content: counter(subitem, lower-alpha) ".";  /* a, b, c for nested ordered */
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 0.8em 0;
            page-break-inside: avoid;
            color: #000;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 0.4em 0.6em; 
            text-align: left; 
            font-size: 10pt;
            color: #000;
        }
        th { 
            background: #f5f5f5; 
            font-weight: 600; 
        }
        a { 
            color: #000; 
            text-decoration: underline; 
        }
        hr { 
            border: none; 
            border-top: 1px solid #ddd; 
            margin: 1.5em 0; 
        }
        strong { font-weight: 700; }
        em { font-style: italic; }
        del { text-decoration: line-through; }
        img { 
            max-width: 100%; 
            height: auto;
            page-break-inside: avoid;
        }
    `;
    
    container.appendChild(styleElement);
    container.innerHTML += mdParser.render(content);
    
    document.body.appendChild(container);
    
    try {
        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `${title.replace(/\s+/g, '_').toLowerCase() || 'draft'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'mm' as const, 
                format: 'a4' as const, 
                orientation: 'portrait' as const,
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'] as const,
                avoid: ['h1', 'h2', 'h3', 'blockquote', 'pre', 'table', 'img']
            }
        };
        
        const html2pdfLib = await loadHtml2pdf();
        await html2pdfLib().set(opt).from(container).save();
    } catch (err) {
        console.error("PDF Export failed", err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};
