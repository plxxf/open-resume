"use client";
import { useEffect, useMemo, useState } from "react";
import Frame, { useFrame } from "react-frame-component";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  A4_WIDTH_PT,
  LETTER_HEIGHT_PX,
  LETTER_WIDTH_PX,
  LETTER_WIDTH_PT,
  LETTER_HEIGHT_PT,
  A4_HEIGHT_PT,
  PAGE_MARGIN_PT,
  PX_PER_PT,
} from "lib/constants";
import dynamic from "next/dynamic";
import { getAllFontFamiliesToLoad } from "components/fonts/lib";

const getIframeInitialContent = (isA4: boolean) => {
  const width = isA4 ? A4_WIDTH_PT : LETTER_WIDTH_PT;
  const allFontFamilies = getAllFontFamiliesToLoad();

  const allFontFamiliesFontFaces = allFontFamilies
    .map(
      (
        font
      ) => `@font-face {font-family: "${font}"; src: url("/fonts/${font}-Regular.ttf");}
@font-face {font-family: "${font}"; src: url("/fonts/${font}-Bold.ttf"); font-weight: bold;}`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <style>
      /* Match react-pdf: padding is inside the width, and a page is at least one sheet tall */
      * { box-sizing: border-box; }
      page { min-height: ${isA4 ? 841.89 : 792}pt; }
      ${allFontFamiliesFontFaces}
    </style>
  </head>
  <body style='overflow: hidden; width: ${width}pt; margin: 0; padding: 0; -webkit-text-size-adjust:none;'>
    <div></div>
  </body>
</html>`;
};

/** Reports the rendered resume height (px) from inside the iframe. */
const ContentHeightReporter = ({ onHeight }: { onHeight: (px: number) => void }) => {
  const { document: doc } = useFrame();
  useEffect(() => {
    if (!doc) return;
    const target = doc.body;
    const measure = () => {
      const page = doc.querySelector("page") as HTMLElement | null;
      onHeight((page || target).scrollHeight);
    };
    measure();
    const view = doc.defaultView as (Window & typeof globalThis) | null;
    const RO = view?.ResizeObserver || ResizeObserver;
    const observer = new RO(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [doc, onHeight]);
  return null;
};

/**
 * Where each PDF page ends in the continuous HTML preview. react-pdf repeats
 * the top and bottom page margins on every page, so page n starts after
 * (n - 1) full usable heights plus one top margin.
 */
const getPageBreaksPx = (contentPx: number, pageHeightPt: number) => {
  const usablePt = pageHeightPt - PAGE_MARGIN_PT * 2;
  const contentPt = contentPx / PX_PER_PT - PAGE_MARGIN_PT * 2;
  const pages = Math.max(1, Math.ceil((contentPt - 1) / usablePt));
  const breaks: number[] = [];
  for (let n = 1; n < pages; n++) {
    breaks.push((PAGE_MARGIN_PT + usablePt * n) * PX_PER_PT);
  }
  return { pages, breaks };
};

/**
 * Iframe is used here for style isolation, since react pdf uses pt unit.
 * It creates a sandbox document body that uses letter/A4 pt size as width.
 */
const ResumeIframe = ({
  documentSize,
  scale,
  children,
  enablePDFViewer = false,
}: {
  documentSize: string;
  scale: number;
  children: React.ReactNode;
  enablePDFViewer?: boolean;
}) => {
  const isA4 = documentSize === "A4";
  const [contentHeight, setContentHeight] = useState(0);
  const iframeInitialContent = useMemo(
    () => getIframeInitialContent(isA4),
    [isA4]
  );

  if (enablePDFViewer) {
    return (
      <DynamicPDFViewer className="h-full w-full">
        {children as any}
      </DynamicPDFViewer>
    );
  }
  const width = isA4 ? A4_WIDTH_PX : LETTER_WIDTH_PX;
  const pageHeight = isA4 ? A4_HEIGHT_PX : LETTER_HEIGHT_PX;
  // The preview grows with the content so every page can be scrolled to.
  const height = Math.max(pageHeight, contentHeight);
  const { pages, breaks } = getPageBreaksPx(height, isA4 ? A4_HEIGHT_PT : LETTER_HEIGHT_PT);

  return (
    <div
      style={{
        maxWidth: `${width * scale}px`,
        maxHeight: `${height * scale}px`,
      }}
    >
      {/* There is an outer div and an inner div here. The inner div sets the iframe width and uses transform scale to zoom in/out the resume iframe.
        While zooming out or scaling down via transform, the element appears smaller but still occupies the same width/height. Therefore, we use the 
        outer div to restrict the max width & height proportionally */}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
        }}
        className={`relative origin-top-left bg-white shadow-lg`}
      >
        <Frame
          style={{ width: "100%", height: "100%" }}
          initialContent={iframeInitialContent}
          // key is used to force component to re-mount when document size changes
          key={isA4 ? "A4" : "LETTER"}
        >
          <ContentHeightReporter onHeight={setContentHeight} />
          {children}
        </Frame>
        {/* Page break markers: where the downloaded PDF starts a new page */}
        {breaks.map((top, i) => (
          <div
            key={top}
            className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-blue-300"
            style={{ top: `${top}px` }}
          >
            <span className="absolute right-2 top-1 rounded bg-blue-50 px-2 py-0.5 text-sm font-medium text-blue-700">
              Page {i + 2} of {pages}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Load iframe client side since iframe can't be SSR
 */
export const ResumeIframeCSR = dynamic(() => Promise.resolve(ResumeIframe), {
  ssr: false,
});

// PDFViewer is only used for debugging. Its size is quite large, so we make it dynamic import
const DynamicPDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((module) => module.PDFViewer),
  {
    ssr: false,
  }
);
