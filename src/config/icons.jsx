const P = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 00-1.5-1.5H5A1.5 1.5 0 003.5 5v9A1.5 1.5 0 005 15.5h3.5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="1.8"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  sync: '<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  receipt: '<path d="M6 3h12v18l-2.5-1.7L13 21l-2.5-1.7L8 21l-2-1.7z"/><path d="M9.5 8h5M9.5 12h5"/>',
  route: '<path d="M4 20l16-8L4 4l3 8z"/><path d="M7 12h13"/>',
  bike: '<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l4.5-8H15l3 8"/><path d="M10.5 9L9 6H6.8"/><path d="M15 9h3"/>',
  building: '<path d="M4 21V4.5A1.5 1.5 0 015.5 3H13a1.5 1.5 0 011.5 1.5V21"/><path d="M14.5 9H19a1.5 1.5 0 011.5 1.5V21"/><path d="M3 21h18M7.5 7h3M7.5 11h3M7.5 15h3"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  layers: '<path d="M12 3l8.5 4.7L12 12.4 3.5 7.7z"/><path d="M4 12l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5"/>',
  food: '<path d="M6 3v6a2.2 2.2 0 004.4 0V3"/><path d="M8.2 11v10"/><path d="M17.5 3c-1.6.8-2.5 2.8-2.5 5.5S15.9 13 17.5 13v8"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M3.5 20a5.5 5.5 0 0111 0"/><path d="M16 5.2a3.3 3.3 0 010 5.6M17 14.4A5.5 5.5 0 0120.5 19.5"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 011-1h7.7l8.3 8.3a1.5 1.5 0 010 2.1l-6.2 6.2a1.5 1.5 0 01-2.1 0z"/><circle cx="8" cy="8" r="1.6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 3.2L12 9.5 15.5 3.2"/><path d="M12 13v4M10 15h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0115 0"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7H16a5 5 0 005-5c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
  shield: '<path d="M12 3l7 2.8V11c0 4.6-3 7.8-7 9.2-4-1.4-7-4.6-7-9.2V5.8z"/><path d="M9.2 12l1.9 1.9 3.7-3.9"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 108.5-8.5A8.5 8.5 0 005 6.8M4 3.5V7h3.5"/><path d="M12 7.5V12l3 1.8"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  power: '<path d="M12 3.5v8"/><path d="M7 7a7 7 0 109.9 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z"/>',
  phoneCall: '<path d="M6.6 10.8a15.7 15.7 0 006.6 6.6l2.2-2.2a1.2 1.2 0 011.2-.3c1.3.4 2.7.6 4.1.6.7 0 1.3.6 1.3 1.3V21c0 .7-.6 1.3-1.3 1.3C10.8 22.3 1.7 13.2 1.7 2.3 1.7 1.6 2.3 1 3 1h3.9c.7 0 1.3.6 1.3 1.3 0 1.4.2 2.8.6 4.1.1.4 0 .9-.3 1.2z"/>',
  mobile: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19.5 3 20.5 4 16.5z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/><path d="M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 19h16"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
};

export default function Icon({ name, className, style }) {
  const inner = P[name] || "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
