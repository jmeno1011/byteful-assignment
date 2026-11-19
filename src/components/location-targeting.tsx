import styles from "./generator-form.module.css";
import { Globe2, MapPin, Network } from "lucide-react";
import type { ProxyGeneratorState } from "@/features/residential/use-proxy-generator";
import LookupSelect from "./lookup-select";

type SectionState = Pick<
  ProxyGeneratorState,
  | "isGenerating"
  | "country"
  | "setCountry"
  | "city"
  | "setCity"
  | "asn"
  | "setAsn"
>;

export default function LocationTargeting({
  generator,
}: {
  generator: SectionState;
}) {
  const { isGenerating, country, setCountry, city, setCity, asn, setAsn } =
    generator;
  return (
    <section
      className={[styles["form-section"], styles["targeting"]].join(" ")}
      aria-labelledby="targeting-title"
    >
      <div className={styles["section-heading"]}>
        <span className={styles["step-icon"]}>
          <Globe2 size={17} />
        </span>
        <div>
          <h3 id="targeting-title">Location & network</h3>
          <p>Go worldwide or get a little more specific.</p>
        </div>
        <button
          type="button"
          className={"text-button"}
          disabled={isGenerating || (!country && !asn)}
          onClick={() => {
            setCountry(null);
            setCity(null);
            setAsn(null);
          }}
        >
          Reset
        </button>
      </div>
      <LookupSelect
        label="Country"
        kind="countries"
        value={country}
        disabled={isGenerating}
        onChange={(value) => {
          setCountry(value);
          setCity(null);
          setAsn(null);
        }}
        placeholder="Any country"
        icon={<Globe2 size={17} />}
      />
      <LookupSelect
        key={`city-${country?.value || "none"}`}
        label="City"
        kind="cities"
        value={city}
        onChange={setCity}
        placeholder={country ? "Any city" : "Choose a country first"}
        disabled={!country || isGenerating}
        country={country?.value}
        icon={<MapPin size={17} />}
      />
      <LookupSelect
        key={`asn-${country?.value || "none"}`}
        label="ISP / ASN"
        kind="asns"
        value={asn}
        onChange={setAsn}
        placeholder="Any network"
        country={country?.value}
        disabled={isGenerating}
        icon={<Network size={17} />}
        hint={
          country
            ? `Networks registered in ${country.label}.`
            : "Search by provider name or ASN, with or without a country."
        }
      />
    </section>
  );
}
