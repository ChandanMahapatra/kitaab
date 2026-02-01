import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MarkdownIt from 'markdown-it';

const mdParser = new MarkdownIt();

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
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        code { font-family: monospace; background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
        blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 1rem; color: #666; }
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
    // Create a temporary container to render HTML for PDF
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.background = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';
    container.innerHTML = mdParser.render(content);

    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        // A4 size standard: 210mm x 297mm
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${title.replace(/\s+/g, '_').toLowerCase() || 'draft'}.pdf`);
    } catch (err) {
        console.error("PDF Export failed", err);
    } finally {
        document.body.removeChild(container);
    }
};
