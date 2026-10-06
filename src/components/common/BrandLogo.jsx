import { useBrand } from "../../context/BrandContext";

export default function BrandLogo({ className = "" }) {
  const { name, logo, loaded } = useBrand();
  if (!loaded) return <span className={`brand-logo ${className}`} />;
  if (logo) return <img className={`brand-logo ${className}`} src={logo} alt={name || "Logo"} />;
  return name ? <span className={`brand-logo brand-logo--text ${className}`}>{name}</span> : <span className={`brand-logo ${className}`} />;
}
