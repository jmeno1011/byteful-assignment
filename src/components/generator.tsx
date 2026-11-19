"use client";

import styles from "./generator.module.css";

import { useProxyGenerator } from "@/features/residential/use-proxy-generator";
import GeneratorForm from "./generator-form";
import Header from "./header";
import ResultPanel from "./result-panel";
import Footer from "./footer";

export default function Generator() {
  const generator = useProxyGenerator();
  const {
    lines,
    isGenerating,
    notice,
    error,
    stale,
    generated,
    format,
    count,
    country,
    city,
    asn,
    session,
    copy,
    download,
    clear,
  } = generator;
  return (
    <div className={styles["app-shell"]}>
      <Header />
      <div>
        <main id="main" className={styles.main}>
          {/* page title */}
          <div className={styles["page-heading"]}>
            <h1>
              Proxy generator<span>.</span>
            </h1>
          </div>
          {/* generate grid 
            left : enter inform
            right : get result
           */}
          <div className={styles["generator-grid"]}>
            {/* generate form */}
            <GeneratorForm generator={generator} />
            <ResultPanel
              lines={lines}
              isGenerating={isGenerating}
              notice={notice}
              error={error}
              stale={!!stale}
              generated={generated}
              format={format}
              quantity={count}
              country={country}
              city={city}
              asn={asn}
              session={session}
              onCopy={copy}
              onDownload={download}
              onClear={clear}
            />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
