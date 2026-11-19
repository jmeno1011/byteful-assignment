import styles from "./generator-form.module.css";
import { Settings2, LockKeyhole, RotateCw } from "lucide-react";
import type { ProxyGeneratorState } from "@/features/residential/use-proxy-generator";
import RadioOption from "./radio-option";
import { formats } from "@/features/residential/use-proxy-generator";

type SectionState = Pick<
  ProxyGeneratorState,
  | "isGenerating"
  | "format"
  | "setFormat"
  | "session"
  | "setSession"
  | "quantityInput"
  | "count"
  | "setCount"
  | "quantityInvalid"
>;

export default function ConnectionOptions({
  generator,
}: {
  generator: SectionState;
}) {
  const {
    isGenerating,
    format,
    setFormat,
    session,
    setSession,
    quantityInput,
    count,
    setCount,
    quantityInvalid,
  } = generator;
  return (
    <section className={styles["form-section"]} aria-labelledby="options-title">
      <div className={styles["section-heading"]}>
        <span className={styles["step-icon"]}>
          <Settings2 size={17} />
        </span>
        <div>
          <h3 id="options-title">Connection options</h3>
          <p>The right format for your workflow.</p>
        </div>
      </div>
      <fieldset disabled={isGenerating}>
        <legend>Protocol</legend>
        <div className={styles["protocols"]}>
          {formats.map((item) => (
            <RadioOption
              key={item}
              name="protocol"
              value={item}
              checked={format === item}
              onChange={() => setFormat(item)}
              text={item.toUpperCase()}
            />
          ))}
        </div>
      </fieldset>
      <fieldset disabled={isGenerating} className={styles["session-field"]}>
        <legend>Session type</legend>
        <div className={styles["session-options"]}>
          <RadioOption
            name="session"
            value="sticky"
            checked={session === "sticky"}
            onChange={() => setSession("sticky")}
            text="Sticky"
            icon={<LockKeyhole size={16} />}
            description="Keep the same IP"
          />
          <RadioOption
            name="session"
            value="rotating"
            checked={session === "rotating"}
            onChange={() => setSession("rotating")}
            text="Rotating"
            icon={<RotateCw size={16} />}
            description="A new IP each request"
          />
        </div>
      </fieldset>
      <div className={styles["quantity-row"]}>
        <div>
          <label htmlFor="quantity">Quantity</label>
          <p className={"field-hint"}>Between 1 and 1,000 proxies</p>
        </div>
        <input
          ref={quantityInput}
          id="quantity"
          type="number"
          min={1}
          max={1000}
          step={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          aria-invalid={quantityInvalid}
          aria-describedby={quantityInvalid ? "quantity-error" : undefined}
          required
          disabled={isGenerating}
        />
      </div>
      {quantityInvalid && (
        <p className={styles["validation-error"]} id="quantity-error">
          Enter a whole number from 1 to 1,000.
        </p>
      )}
    </section>
  );
}
