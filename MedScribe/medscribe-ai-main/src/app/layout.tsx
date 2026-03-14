import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Scriva",
    template: "%s — Scriva",
  },
  description: "Clinical AI for European Healthcare — real-time transcription, diagnostic guidance, and intelligent documentation",
  metadataBase: new URL("https://scriva.doctor"),
  openGraph: {
    title: "Scriva — Clinical AI for European Healthcare",
    description: "Real-time transcription, diagnostic guidance, and intelligent documentation for clinicians",
    siteName: "Scriva",
    locale: "en_EU",
    type: "website",
  },
};

const STALE_BUNDLE_RECOVERY = `
(function(){
  var K="scriva_chunk_reload",M=2;
  window.addEventListener("error",function(e){
    var m=e.message||"";
    if(m.indexOf("Loading chunk")>-1||m.indexOf("ChunkLoadError")>-1||
       m.indexOf("#310")>-1||m.indexOf("more hooks")>-1){
      try{
        var a=parseInt(sessionStorage.getItem(K)||"0",10);
        if(a>=M)return;
        sessionStorage.setItem(K,String(a+1));
        var u=new URL(location.href);
        u.searchParams.set("_v",Date.now());
        location.replace(u);
      }catch(x){}
    }
  });
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="stale-bundle-recovery" strategy="beforeInteractive">
          {STALE_BUNDLE_RECOVERY}
        </Script>
      </head>
      <body
        className={`${inter.variable} font-sans bg-medical-bg text-medical-text antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
