import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [popularOpen, setPopularOpen] = useState(false);

  const popularSearches = [
    'Lands in Colombo', 'Luxury Residencies', 'Apartments Negombo',
    'Land Plots Gampaha', 'Houses Kandy', 'Investment Properties',
    'Gated Communities', 'Sea View Villas',
  ];

  return (
    <footer className="site-footer" id="contact">
      <div className="site-footer__inner">

        <div className="site-footer__top">
          <Link to="/" className="site-footer__brand" aria-label="Odiliya home">
            <img src="/odiliya-logo.png" alt="Odiliya Homes & Real Estate" className="site-footer__logo" />
            <span className="site-footer__brand-text">
              <span className="site-footer__brand-name">ODILIYA</span>
              <span className="site-footer__brand-sub">HOMES &amp; REAL ESTATE</span>
            </span>
          </Link>
        </div>

        <div className="site-footer__divider" />

        {/* Popular Searches */}
        <div className="site-footer__popular">
          <button
            type="button"
            className="site-footer__popular-toggle"
            onClick={() => setPopularOpen(o => !o)}
          >
            Popular Searches
            <span className="site-footer__popular-icon">{popularOpen ? '−' : '+'}</span>
          </button>
          {popularOpen && (
            <div className="site-footer__popular-tags">
              {popularSearches.map(s => (
                <a key={s} href="#properties" className="site-footer__popular-tag">{s}</a>
              ))}
            </div>
          )}
        </div>

        <div className="site-footer__divider" />

        {/* 4-column links grid */}
        <div className="site-footer__cols">

          <div className="site-footer__col">
            <h4 className="site-footer__col-title">About Us &amp; Contact</h4>
            <ul className="site-footer__link-list">
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact us</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
              <li><Link to="/register">KYC</Link></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#ims">IMS Policy</a></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__col-title">Property &amp; Services</h4>
            <ul className="site-footer__link-list">
              <li><a href="#properties" className="site-footer__link--accent">Lands</a></li>
              <li><a href="#properties" className="site-footer__link--accent">Houses</a></li>
              <li><a href="#properties" className="site-footer__link--accent">Apartments</a></li>
              <li><a href="#properties" className="site-footer__link--accent">Portfolio Properties</a></li>
              <li><a href="#properties">Services</a></li>
              <li><a href="#virtual-tour">Virtual Tour</a></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__col-title">News &amp; Publications</h4>
            <ul className="site-footer__link-list">
              <li><a href="#news">News</a></li>
              <li><a href="#publications" className="site-footer__link--accent">Online Publications</a></li>
              <li><a href="#blogs">Blogs</a></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__col-title">Contact Details</h4>
            <p className="site-footer__contact-head">Head Office</p>
            <p className="site-footer__contact-addr">
              No.75, D.S. Senanayake Mawatha, Borella,<br />
              Colombo 08, Sri Lanka,
            </p>
            <a href="tel:+94112699822" className="site-footer__contact-phone">+94 112 699 822</a>
            <a href="tel:+94112030890" className="site-footer__contact-phone">+94 112 030 890</a>
            <a href="mailto:info@odiliya.lk" className="site-footer__contact-email">info@odiliya.lk</a>
          </div>

        </div>

      </div>
    </footer>
  );
}