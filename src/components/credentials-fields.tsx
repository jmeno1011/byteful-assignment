import styles from "./generator-form.module.css";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import type { ProxyGeneratorState } from "@/features/residential/use-proxy-generator";

type SectionState = Pick<
  ProxyGeneratorState,
  | "userIdInput"
  | "passwordInput"
  | "missingUserId"
  | "missingPassword"
  | "userId"
  | "setUserId"
  | "password"
  | "setPassword"
  | "showPassword"
  | "setShowPassword"
  | "isGenerating"
>;

export default function CredentialsFields({
  generator,
}: {
  generator: SectionState;
}) {
  const {
    userIdInput,
    passwordInput,
    missingUserId,
    missingPassword,
    userId,
    setUserId,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isGenerating,
  } = generator;
  return (
    <section
      className={styles["form-section"]}
      aria-labelledby="credentials-title"
    >
      <div className={styles["section-heading"]}>
        <span className={styles["step-icon"]}>
          <KeyRound size={17} />
        </span>
        <div>
          <h3 id="credentials-title">Connection credentials</h3>
          <p>Use your proxy user, not your API keys.</p>
        </div>
      </div>
      {/* TODO: reusable component */}
      <div className={styles["field"]}>
        <label htmlFor="user-id">Proxy user ID</label>
        <input
          ref={userIdInput}
          id="user-id"
          aria-invalid={missingUserId}
          aria-describedby={missingUserId ? "user-id-error" : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Enter your proxy user ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          disabled={isGenerating}
        />
        {missingUserId && (
          <p id="user-id-error" className={styles["validation-error"]}>
            Enter your proxy user ID.
          </p>
        )}
      </div>
      <div className={styles["field"]}>
        <label htmlFor="proxy-password">Proxy password</label>
        <div className={styles["password-input"]}>
          <input
            ref={passwordInput}
            id="proxy-password"
            aria-invalid={missingPassword}
            aria-describedby={missingPassword ? "password-error" : undefined}
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            placeholder="Enter your proxy password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isGenerating}
          />
          <button
            type="button"
            className={"icon-button"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {missingPassword && (
          <p id="password-error" className={styles["validation-error"]}>
            Enter your proxy password.
          </p>
        )}
      </div>
    </section>
  );
}
