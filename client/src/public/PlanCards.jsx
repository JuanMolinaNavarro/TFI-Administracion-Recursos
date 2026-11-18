import React from 'react';
import { clubPlans, customPlan, planGuarantee } from './clubPlans.js';

export function PlanCards({ onSelect }) {
  return <div className="club-pricing-grid">{clubPlans.map(plan => <div className={`club-pricing-card ${plan.featured ? 'featured-plan' : ''}`} key={plan.name}>
    {plan.featured && <div className="plan-popular-badge">Más Popular</div>}
    <div className="plan-card-body">
      <div className="plan-header">
        <h3 className="plan-name">{plan.name}</h3>
        <div className="plan-price-row"><span className="plan-amount">{plan.price}</span><span className="plan-period">{plan.period}</span></div>
        <p className="plan-description">{plan.description}</p>
      </div>
      <ul className="plan-features-list">{plan.features.map(feature => <li key={feature}><i className="fa-solid fa-check" aria-hidden="true"></i> <span>{feature}</span></li>)}</ul>
      <button type="button" className="plan-cta-btn" onClick={() => onSelect({ name: plan.name, price: `${plan.price} ${plan.period}` })}>Suscribirse Ahora</button>
    </div>
  </div>)}</div>;
}

export function PlanGuarantee({ onSelect }) {
  return <div className="plans-guarantee-card">
    <div className="guarantee-icon"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i></div>
    <div className="guarantee-text"><h4>{planGuarantee.title}</h4><p>{planGuarantee.text}</p></div>
    <button type="button" className="guarantee-btn" onClick={() => onSelect(customPlan)}><i className="fa-solid fa-headset" aria-hidden="true"></i> Hablar con Asesor</button>
  </div>;
}
