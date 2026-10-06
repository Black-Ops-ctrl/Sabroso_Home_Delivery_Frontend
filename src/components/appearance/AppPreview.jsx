const grad = (a, b, deg = 135) => `linear-gradient(${deg}deg, ${a}, ${b})`;

export default function AppPreview({ pv, a }) {
  switch (pv) {
    case "header":
      return <div className="ap-ahead" style={{ background: grad(a["header-top"], a["header-bottom"], 150) }}>Orders</div>;
    case "background":
      return <div className="ap-abg" style={{ background: a.background }}><b style={{ background: a.card }} /></div>;
    case "card":
      return <div className="ap-abg" style={{ background: a.background }}><b style={{ background: a.card }} /></div>;
    case "accent":
      return (
        <div className="ap-app">
          <span className="ap-achip" style={{ background: a.accent }}>Assigned 2</span>
          <span className="ap-atog" style={{ background: a.accent }} />
        </div>
      );
    case "text":
      return <div className="ap-abg" style={{ background: a.card, color: a.text, fontSize: ".75rem", fontWeight: 600 }}>Ahmed Ali</div>;
    case "muted":
      return <div className="ap-abg" style={{ background: a.card, color: a.muted, fontSize: ".75rem" }}>2 items · Rs 1,400</div>;
    case "nav":
    case "pill":
      return (
        <div className="ap-anav" style={{ background: grad(a["nav-top"], a["nav-bottom"], 90) }}>
          <span className="on" style={{ background: a["nav-pill"], color: a["nav-active"] }}>Home</span>
          <span>Orders</span>
          <span>History</span>
          <span>Settings</span>
        </div>
      );
    case "slide":
      return <div className="ap-aslide" style={{ background: grad(a["slide-top"], a["slide-bottom"], 90) }}><i />Slide to sign in</div>;
    case "ofd":
      return <span className="ap-abtn" style={{ background: grad(a["ofd-top"], a["ofd-bottom"]) }}>Out for delivery</span>;
    case "delivered":
      return <span className="ap-abtn" style={{ background: grad(a["delivered-top"], a["delivered-bottom"]) }}>Delivered</span>;
    case "cancel":
      return (
        <div className="ap-app">
          <span className="ap-ax" style={{ background: `${a.cancel}1f`, color: a.cancel }}>✕</span>
          <span className="ap-abtn" style={{ background: a.cancel }}>Cancel order</span>
        </div>
      );
    case "shop":
      return <span className="ap-abtn" style={{ background: grad(a["go-shop-top"], a["go-shop-bottom"], 90) }}>Go to shop</span>;
    case "success":
      return <span className="ap-amsg"><i style={{ background: a.success }}>✓</i>SB-20090 delivered</span>;
    case "error":
      return <span className="ap-amsg"><i style={{ background: a.error }}>!</i>No internet</span>;
    case "info":
      return <span className="ap-amsg"><i style={{ background: a.info }}>i</i>New order assigned</span>;
    case "ring":
      return (
        <svg className="ap-aring" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#ece8f4" strokeWidth="5" />
          <circle cx="18" cy="18" r="14" fill="none" stroke={a.ring} strokeWidth="5" strokeLinecap="round" strokeDasharray="62 88" transform="rotate(-90 18 18)" />
        </svg>
      );
    case "chart":
      return (
        <div className="ap-bars">
          {[45, 70, 35, 60, 100].map((h, i) => <i key={i} style={{ height: `${h}%`, background: i === 4 ? a["chart-bar"] : "#e4dfea" }} />)}
        </div>
      );
    default:
      return null;
  }
}
