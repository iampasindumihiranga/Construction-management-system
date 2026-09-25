export default function CreativeResidencesShowcase({ onViewAll, onSelectResidence }) {
  return (
    <section className="creative-residences-section" id="the-residences">
      <div className="residences-header-container">
        <h2 className="residences-main-title">The Residences</h2>
        <p className="residences-main-desc">
          Each residence under the Prime umbrella is a thoughtfully crafted commitment to community, and to quality.
          Ranging from the tastefully opulent One Collection to the breezy charm of our Leisure Residences,
          discover the Prime Residences promise within the concrete embrace of our offerings.
        </p>
      </div>

      <div className="residences-cards-grid">
        {/* Card 1: The One Collection (High-rise architectural image) */}
        <div
          className="residence-card residence-card-image card-one-collection"
          onClick={() => onSelectResidence && onSelectResidence('The One Collection')}
          role="button"
          tabIndex={0}
        >
          <div className="card-image-bg img-tower-one" />
          <div className="card-gradient-overlay" />
          <div className="card-caption-bottom">
            <h3 className="residence-title">The One Collection</h3>
          </div>
        </div>

        {/* Card 2: Barefoot Luxury (Light Cream / Champagne Card) */}
        <div className="residence-card residence-card-cream card-barefoot-luxury">
          <div className="cream-card-inner">
            <h3 className="cream-card-title">Barefoot Luxury</h3>
            <p className="cream-card-desc">
              Barefoot Luxury Residences embrace the art of slowing down — spaces inspired by the
              sea, forests and mountains enriched by history, and shaped for sophisticated ease...
            </p>
            <button
              type="button"
              className="cream-card-btn"
              onClick={() => onViewAll ? onViewAll() : (onSelectResidence && onSelectResidence('Barefoot Luxury Residences'))}
            >
              <span>VIEW ALL</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>

        {/* Card 3: Lifestyle Residences (Night High-Rise Cityscape) */}
        <div
          className="residence-card residence-card-image card-lifestyle-residences"
          onClick={() => onSelectResidence && onSelectResidence('Lifestyle Residences')}
          role="button"
          tabIndex={0}
        >
          <div className="card-image-bg img-night-skyline" />
          <div className="card-gradient-overlay" />
          <div className="card-caption-bottom">
            <h3 className="residence-title">Lifestyle Residences</h3>
          </div>
        </div>
      </div>
    </section>
  );
}
