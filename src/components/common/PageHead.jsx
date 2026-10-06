import Icon from "../../config/icons";

export default function PageHead({ title, onBack, backLabel = "Back", children }) {
  return (
    <div className={`ord-head ${onBack ? "ord-head--back" : ""}`}>
      {onBack && (
        <button className="backc backc--head" onClick={onBack} aria-label={backLabel}>
          <span className="ic">
            <Icon name="back" />
          </span>
          <span className="backc__t">{backLabel}</span>
        </button>
      )}
      <h1>{title}</h1>
      {children ? <div className="ord-head__actions">{children}</div> : onBack ? <span className="ord-head__spacer" /> : null}
    </div>
  );
}
