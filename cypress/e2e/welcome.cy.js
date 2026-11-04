/**
 * E2E spec — Welcome page and navigation to Setup.
 */
describe('Welcome Page', () => {
  beforeEach(() => {
    // Clear localStorage so we always start unauthenticated
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('displays the VedAstro branding', () => {
    cy.contains('VedAstro', { matchCase: false }).should('be.visible');
  });

  it('has a visible call-to-action button', () => {
    // The welcome page CTA typically says "Get Started" or similar
    cy.get('button, a[href]').first().should('be.visible');
  });

  it('navigates to /setup when the CTA is clicked', () => {
    cy.get('button').first().click();
    cy.url().should('include', '/setup');
  });
});

describe('Setup Page', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/setup');
  });

  it('loads without errors', () => {
    cy.get('body').should('be.visible');
  });

  it('shows credential input fields', () => {
    cy.get('input').should('have.length.greaterThan', 0);
  });
});
