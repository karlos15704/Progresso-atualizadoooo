import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function parseOklch(str: string) {
  const numbers = str.match(/-?[0-9.]+%?/g);
  if (!numbers || numbers.length < 3) return null;
  
  let l = parseFloat(numbers[0]);
  if (numbers[0].endsWith('%')) l /= 100;
  
  let c = parseFloat(numbers[1]);
  if (numbers[1].endsWith('%')) c /= 100;
  
  let h = parseFloat(numbers[2]);
  const hRad = (h * Math.PI) / 180;
  
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  let alpha = 1;
  if (numbers.length >= 4) {
    alpha = parseFloat(numbers[3]);
    if (numbers[3].endsWith('%')) alpha /= 100;
  }
  
  return { l, a, b, alpha };
}

function parseOklab(str: string) {
  const numbers = str.match(/-?[0-9.]+%?/g);
  if (!numbers || numbers.length < 3) return null;
  
  let l = parseFloat(numbers[0]);
  if (numbers[0].endsWith('%')) l /= 100;
  
  let a = parseFloat(numbers[1]);
  if (numbers[1].endsWith('%')) a /= 100;
  
  let b = parseFloat(numbers[2]);
  if (numbers[2].endsWith('%')) b /= 100;
  
  let alpha = 1;
  if (numbers.length >= 4) {
    alpha = parseFloat(numbers[3]);
    if (numbers[3].endsWith('%')) alpha /= 100;
  }
  
  return { l, a, b, alpha };
}

function oklabToRgb(l: number, a: number, b: number, alpha: number): string {
  const L = l + 0.3963377774 * a + 0.2158037573 * b;
  const M = l - 0.1055613458 * a - 0.0638541728 * b;
  const S = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const L3 = L * L * L;
  const M3 = M * M * M;
  const S3 = S * S * S;
  
  const r = +4.0767416621 * L3 - 3.3077115913 * M3 + 0.2309699292 * S3;
  const g = -1.2684380046 * L3 + 2.6097574011 * M3 - 0.3413193965 * S3;
  const bVal = -0.0041960863 * L3 - 0.7034186147 * M3 + 1.7076147010 * S3;
  
  const toSRGB = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  
  const R = Math.round(Math.max(0, Math.min(1, toSRGB(r))) * 255);
  const G = Math.round(Math.max(0, Math.min(1, toSRGB(g))) * 255);
  const B = Math.round(Math.max(0, Math.min(1, toSRGB(bVal))) * 255);
  
  if (alpha < 1) {
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
  return `rgb(${R}, ${G}, ${B})`;
}

function convertOklchAndOklabToRgb(value: string): string {
  if (!value) return value;
  
  let result = value;
  
  if (result.includes('oklch(')) {
    result = result.replace(/oklch\([^)]+\)/g, (match) => {
      try {
        const parsed = parseOklch(match);
        if (parsed) {
          return oklabToRgb(parsed.l, parsed.a, parsed.b, parsed.alpha);
        }
      } catch (e) {
        console.error("Error converting OKLCH color:", match, e);
      }
      return match;
    });
  }
  
  if (result.includes('oklab(')) {
    result = result.replace(/oklab\([^)]+\)/g, (match) => {
      try {
        const parsed = parseOklab(match);
        if (parsed) {
          return oklabToRgb(parsed.l, parsed.a, parsed.b, parsed.alpha);
        }
      } catch (e) {
        console.error("Error converting OKLAB color:", match, e);
      }
      return match;
    });
  }
  
  return result;
}

function interceptGetComputedStyleOnWindow(win: Window) {
  const originalGetComputedStyle = win.getComputedStyle;
  
  win.getComputedStyle = function(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(win, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const value = target.getPropertyValue(propertyName);
            return convertOklchAndOklabToRgb(value);
          };
        }
        
        const value = target[prop as any];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        if (typeof value === 'string') {
          return convertOklchAndOklabToRgb(value);
        }
        return value;
      }
    });
  };
  
  return () => {
    win.getComputedStyle = originalGetComputedStyle;
  };
}

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const restoreGlobal = interceptGetComputedStyleOnWindow(window);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedWindow = clonedDoc.defaultView;
        if (clonedWindow) {
          interceptGetComputedStyleOnWindow(clonedWindow);
        }

        // Reset scale wrapper and scaling transform styles in the cloned document!
        // This ensures html2canvas renders the pages at their native pristine 100% resolution/layout.
        const scaleWrappers = clonedDoc.querySelectorAll('.exam-page-scale-wrapper');
        scaleWrappers.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.height = 'auto';
          htmlEl.style.maxHeight = 'none';
          htmlEl.style.overflow = 'visible';
          htmlEl.style.transform = 'none';
        });

        const examPages = clonedDoc.querySelectorAll('.exam-page');
        examPages.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.transform = 'none';
          htmlEl.style.width = '210mm';
          htmlEl.style.height = '297mm';
          htmlEl.style.minHeight = '297mm';
          htmlEl.style.maxHeight = '297mm';
        });
      }
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const totalImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (totalImgHeight <= pageHeight + 2) {
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, totalImgHeight);
    } else {
      const numPages = Math.ceil(totalImgHeight / pageHeight);
      for (let j = 0; j < numPages; j++) {
        if (j > 0) {
          pdf.addPage();
        }
        const yOffset = -j * pageHeight;
        pdf.addImage(imgData, "PNG", 0, yOffset, pdfWidth, totalImgHeight);
      }
    }
    pdf.save(`${filename}.pdf`);
  } finally {
    restoreGlobal();
  }
}

export async function exportMultipleToPDF(elementClass: string, filename: string, onProgress?: (msg: string) => void) {
  const elements = document.getElementsByClassName(elementClass);
  if (!elements || elements.length === 0) return;

  const restoreGlobal = interceptGetComputedStyleOnWindow(window);

  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elements.length; i++) {
      if (onProgress) onProgress(`Gerando página ${i + 1} de ${elements.length}...`);
      const element = elements[i] as HTMLElement;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            interceptGetComputedStyleOnWindow(clonedWindow);
          }

          // Reset scale wrapper and scaling transform styles in the cloned document!
          // This ensures html2canvas renders the pages at their native pristine 100% resolution/layout.
          const scaleWrappers = clonedDoc.querySelectorAll('.exam-page-scale-wrapper');
          scaleWrappers.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.height = 'auto';
            htmlEl.style.maxHeight = 'none';
            htmlEl.style.overflow = 'visible';
            htmlEl.style.transform = 'none';
          });

          const examPages = clonedDoc.querySelectorAll('.exam-page');
          examPages.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.transform = 'none';
            htmlEl.style.width = '210mm';
            htmlEl.style.height = '297mm';
            htmlEl.style.minHeight = '297mm';
            htmlEl.style.maxHeight = '297mm';
          });
        }
      });
      
      const imgData = canvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(imgData);
      const totalImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (totalImgHeight <= pageHeight + 2) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, totalImgHeight);
      } else {
        const numPages = Math.ceil(totalImgHeight / pageHeight);
        for (let j = 0; j < numPages; j++) {
          if (i > 0 || j > 0) {
            pdf.addPage();
          }
          const yOffset = -j * pageHeight;
          pdf.addImage(imgData, "PNG", 0, yOffset, pdfWidth, totalImgHeight);
        }
      }
    }

    if (onProgress) onProgress("Salvando PDF...");
    pdf.save(`${filename}.pdf`);
  } finally {
    restoreGlobal();
  }
}
