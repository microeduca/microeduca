import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink, Download, Printer } from 'lucide-react';

type PdfViewerProps = {
  url: string;
  title?: string;
  className?: string;
};

// Configurar worker do PDF.js para Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

export default function PdfViewer({ url, title, className }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  // Ajustar largura conforme o container (responsivo)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    setContainerWidth(el.clientWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages: nextNum }: { numPages: number }) => {
    setNumPages(nextNum);
    setPageNumber(1);
  };

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < Math.max(1, numPages);

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onPrint = () => {
    // Estratégia simples: abrir em nova aba e o usuário imprime de lá
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toolbar = (
    <div className="absolute top-0 left-0 right-0 z-10 bg-black/60 text-white px-3 py-2 flex items-center gap-2">
      <div className="truncate">
        <span className="text-sm font-medium">{title || 'Documento PDF'}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button size="icon" variant="ghost" className="text-white" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="px-2 text-xs tabular-nums">{Math.round(scale * 100)}%</div>
        <Button size="icon" variant="ghost" className="text-white" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-2 w-px h-5 bg-white/30" />
        <Button size="icon" variant="ghost" disabled={!canPrev} className="text-white" onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="px-2 text-xs tabular-nums">{pageNumber} / {numPages || 1}</div>
        <Button size="icon" variant="ghost" disabled={!canNext} className="text-white" onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mx-2 w-px h-5 bg-white/30" />
        <Button size="icon" variant="ghost" className="text-white" onClick={openInNewTab} title="Abrir em nova guia">
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-white" onClick={onDownload} title="Baixar">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-white" onClick={onPrint} title="Imprimir">
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    // Margens internas para scroll
    return Math.floor(containerWidth * 0.98);
  }, [containerWidth]);

  return (
    <div ref={containerRef} className={[className, 'bg-black relative overflow-auto'].filter(Boolean).join(' ')}>
      {toolbar}
      <div className="pt-10 pb-4 flex justify-center">
        <Document file={url} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="text-white/70 p-4">Carregando PDF…</div>} noData={<div className="text-white/70 p-4">PDF não disponível</div>}>
          <Page pageNumber={pageNumber} scale={scale} width={pageWidth} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      </div>
    </div>
  );
}


