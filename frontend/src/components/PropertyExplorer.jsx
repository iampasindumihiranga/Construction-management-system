import { useEffect, useState } from 'react';
import { formatMoney } from '../services/api';

export default function PropertyExplorer({
  projects = [],
  selectedCategory = 'RESIDENCIES',
  onSelectCategory,
  onInquire,
  onSelectProject,
}) {
  const [activeTab, setActiveTab] = useState(selectedCategory);

  useEffect(() => {
    if (selectedCategory) {
      setActiveTab(selectedCategory);
    }
  }, [selectedCategory]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (onSelectCategory) onSelectCategory(tab);
  };

  // Count items per category
  const residenciesCount = projects.filter((p) => p.category === 'RESIDENCIES').length;
  const landsCount = projects.filter((p) => p.category === 'LANDS').length;
  const apartmentsCount = projects.filter((p) => p.category === 'HOMES' || p.category === 'APARTMENTS').length;

  const filteredProjects = projects.filter((p) => {
    let matchesTab = false;
    if (activeTab === 'RESIDENCIES') matchesTab = p.category === 'RESIDENCIES';
    else if (activeTab === 'LANDS') matchesTab = p.category === 'LANDS';
    else if (activeTab === 'APARTMENTS') matchesTab = p.category === 'HOMES' || p.category === 'APARTMENTS';
    else matchesTab = true;

    return matchesTab;
  });

  return (
    <section className="property-explorer-light" id="properties">
      <div className="explorer-container">
        {/* Screenshot 3: Pill Tabs */}
        <div className="screenshot3-pill-tabs" role="tablist">
          <button
            type="button"
            className={`pill-tab-item ${activeTab === 'RESIDENCIES' ? 'active' : ''}`}
            onClick={() => handleTabClick('RESIDENCIES')}
          >
            
            <span className="tab-text">Residencies</span>
            <span className="tab-pill-badge">{residenciesCount} Available</span>
          </button>

          <button
            type="button"
            className={`pill-tab-item ${activeTab === 'LANDS' ? 'active' : ''}`}
            onClick={() => handleTabClick('LANDS')}
          >
            
            <span className="tab-text">Lands &amp; Plots</span>
            <span className="tab-pill-badge">{landsCount} Plots</span>
          </button>

          <button
            type="button"
            className={`pill-tab-item ${activeTab === 'APARTMENTS' ? 'active' : ''}`}
            onClick={() => handleTabClick('APARTMENTS')}
          >
            
            <span className="tab-text">Apartments</span>
            <span className="tab-pill-badge">{apartmentsCount} Units</span>
          </button>
        </div>

        {/* Section heading */}
        <div className="explorer-controls-bar">
          <div className="section-title-wrap">
            <span className="brand-green-subtitle">HANDPICKED DEVELOPMENTS</span>
            <h2 className="section-heading">Featured {activeTab === 'RESIDENCIES' ? 'Residencies' : activeTab === 'LANDS' ? 'Lands & Plots' : 'Apartments & Homes'}</h2>
          </div>

        </div>

        {/* Property Cards Grid in Light Theme */}
        <div className="light-property-grid">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((item) => (
              <article className="light-property-card" key={item.id}>
                <div className="card-media-wrap">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'}
                    alt={item.name}
                    className="card-media-img"
                    loading="lazy"
                  />
                  <span className="media-tag-badge">{item.category}</span>
                  <span className="media-status-pill">
                    {item.status ? (item.status === 'COMPLETED' ? 'Ready for Handover' : `${item.progressPercentage || 0}% Built`) : 'Available Design'}
                  </span>
                </div>

                <div className="card-content-body">
                  {item.location && <span className="card-location">{item.location}</span>}
                  <h3 className="card-title">{item.name}</h3>
                  <p className="card-description">{item.description}</p>

                  {item.specifications && (
                    <div className="card-specs-chip">
                      
                      <span>{item.specifications}</span>
                    </div>
                  )}

                  {(item.remarks || item.constructionStatus) && (
                    <div className="card-construction-box">
                      <small>Design Notes / Remarks:</small>
                      <p>{item.remarks || item.constructionStatus}</p>
                      {item.progressPercentage !== undefined && item.progressPercentage > 0 && (
                        <div className="construction-progress-track">
                          <div
                            className="construction-progress-fill"
                            style={{ width: `${item.progressPercentage || 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card-footer-strip">
                    <div className="card-price-block">
                      <small>Starting From</small>
                      <strong>{item.priceRange || (item.budget ? formatMoney(item.budget) : 'Inquire for Price')}</strong>
                    </div>

                    <div className="card-actions-row">
                      {onInquire && (
                        <button
                          type="button"
                          className="btn-outline-green"
                          onClick={() => onInquire(item)}
                        >
                          Inquire
                        </button>
                      )}
                      {onSelectProject && (
                        <button
                          type="button"
                          className="btn-solid-green"
                          onClick={() => onSelectProject(item)}
                        >
                          Details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-results-box">
              
              <h3>No properties found in this category</h3>
              <p>Please select another property category above.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
