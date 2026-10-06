import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Icon from "../../config/icons";

export default function Layout({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  useEffect(() => {
    const onOver = (e) => {
      const td = e.target.closest?.("td");
      if (!td) return;
      const cut = td.scrollWidth > td.clientWidth + 1 ||
        [...td.querySelectorAll("div,span")].some((el) => el.scrollWidth > el.clientWidth + 1);
      if (cut && !td.hasAttribute("title")) { td.setAttribute("title", td.innerText.trim()); td.dataset.autoTitle = "1"; }
      else if (!cut && td.dataset.autoTitle) { td.removeAttribute("title"); delete td.dataset.autoTitle; }
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, []);

  const name = pathname.replace(/^\//, "").split("/")[0] || "dashboard";

  return (
    <>
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <button
        className="menu-fab"
        onClick={() => setNavOpen(true)}
        aria-label="Open menu"
      >
        <Icon name="menu" />
      </button>
      <div className="shell">
        <Sidebar onNavigate={() => setNavOpen(false)} />
        <div className="main">
          <div className={`page page--${name}`}>{children}</div>
        </div>
      </div>
    </>
  );
}
