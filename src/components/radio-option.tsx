import styles from "./radio-option.module.css";
import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";

type RadioOptionProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  text: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
};

export default function RadioOption({
  name,
  value,
  checked,
  onChange,
  text,
  icon,
  description,
  disabled,
}: RadioOptionProps) {
  const descriptionId = useId();

  return (
    <label
      className={`${styles["radio-option"]}${checked ? " " + styles.chosen : ""}${description ? " " + styles["radio-option-detailed"] : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={text}
        aria-describedby={description ? descriptionId : undefined}
      />
      <span className={styles["radio-option-heading"]}>
        {icon && (
          <span className={styles["radio-option-icon"]} aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{text}</span>
        <Check
          className={styles["radio-option-check"]}
          size={15}
          aria-hidden="true"
        />
      </span>
      {description && <small id={descriptionId}>{description}</small>}
    </label>
  );
}
