import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../ui/Brand";

const YEAR = new Date().getFullYear();

export function Footer(): ReactElement {
  return (
    <footer className="footer">
      <div className="wrap footer__row">
        <div>
          <Brand />
          <p className="footer__meta">
            Monitor. Team. Data. Privacy.
            <br />
            SKYTECHNO · New Delhi, India
          </p>
        </div>
        <ul className="footer__links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/early-access">Early access</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
        <p className="footer__meta">
          © <span data-year="">{YEAR}</span> SKYTECHNO. zinwe.io
        </p>
      </div>
    </footer>
  );
}
