import styles from "./generator-form.module.css";
import { LoaderCircle, Settings2, ShieldCheck, Zap } from "lucide-react";
import type { ProxyGeneratorState } from "@/features/residential/use-proxy-generator";
import CredentialsFields from "./credentials-fields";
import ConnectionOptions from "./connection-options";
import LocationTargeting from "./location-targeting";

export default function GeneratorForm({
  generator,
}: {
  generator: ProxyGeneratorState;
}) {
  const { form, submit, validationAttempted, valid, isGenerating, count } =
    generator;
  return (
    <form
      ref={form}
      noValidate
      onSubmit={submit}
      className={styles["configuration"]}
      aria-label="Proxy configuration"
    >
      <div className={styles["form-heading"]}>
        <Settings2 size={18} />
        <h2>Configure your proxies</h2>
        <span>YOUR SETUP</span>
      </div>
      {validationAttempted && !valid && (
        <div className={styles["form-validation-summary"]} role="alert">
          Please complete the highlighted fields.
        </div>
      )}
      {/* credentials */}
      <CredentialsFields generator={generator} />
      {/* options */}
      <ConnectionOptions generator={generator} />
      {/* Location & Network */}
      <LocationTargeting generator={generator} />
      {/* Generate Button */}
      <div className={styles["generate-area"]}>
        <button
          type="submit"
          className={styles["primary-button"]}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <LoaderCircle size={18} className={"spin"} />
          ) : (
            <Zap size={18} />
          )}{" "}
          {isGenerating ? "Generating proxies…" : "Generate proxies"}
          <kbd aria-hidden="true">
            {valid
              ? `${Number(count).toLocaleString()} proxies`
              : "Check setup"}
          </kbd>
        </button>
        <p>
          <ShieldCheck size={18} /> Your credentials are never stored.
        </p>
      </div>
    </form>
  );
}
