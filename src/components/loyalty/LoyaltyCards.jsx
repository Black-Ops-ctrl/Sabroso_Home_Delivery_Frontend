import BrandLogo from "../common/BrandLogo";
import { tierRange, discText } from "../../config/loyalty";

const LIGHT = ["silver", "gold", "rosegold", "diamond", "pearl", "coral", "mint", "ice", "champagne", "lavender", "holo", "marble", "sunrise"];
export const cardClass = (card) => `ccard--${card || "basic"}${LIGHT.includes(card) ? " ccard--light" : ""}`;

export function LoyaltyStatCard({ tier, count, tiers, active, onClick }) {
  return (
    <button className={`scard ${cardClass(tier.card)} ${active ? "is-active" : ""}`} onClick={onClick} title={`View ${tier.name} members`}>
      <div className="cc-rooster">🐓</div>
      <div className="scard-top">
        <div className="cc-logo">
          <BrandLogo />
        </div>
      </div>
      <div className="scard-strip">
        <span>{(tier.name || "").toUpperCase()}</span>
      </div>
      <div className="scard-foot">
        <div className="scard-tier">{tier.name}</div>
        <span className="scard-disc">{discText(tier.discount_type, tier.discount)} off</span>
        <div className="scard-pts">
          {tierRange(tiers, tier)} pts · {count} member{count === 1 ? "" : "s"}
        </div>
      </div>
    </button>
  );
}

export function LoyaltyCard({ tier }) {
  return (
    <div className={`ccard ${cardClass(tier.card)}`}>
      <div className="cc-shine" />
      <div className="cc-rooster">🐓</div>
      <div className="cc-head">
        <div className="cc-logo">
          <BrandLogo />
        </div>
        <div className="cc-club">
          CHICKMATE
          <br />
          LOYALTY CLUB
        </div>
      </div>
      <div className="cc-num">1234 5678 9012 3456</div>
      <div className="cc-name">CARDHOLDER NAME</div>
      <div className="cc-strip">
        <span>{(tier.name || "").toUpperCase()}</span>
      </div>
    </div>
  );
}

export function StyleMini({ code, label }) {
  return (
    <div className={`mini ccard ${cardClass(code)}`} role="img" aria-label={label} style={{ width: "auto", height: 84, padding: "8px 10px", animation: "none" }}>
      <span className="ms cc-strip" style={{ width: 14 }} />
    </div>
  );
}
