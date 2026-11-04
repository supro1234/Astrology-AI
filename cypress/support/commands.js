// cypress/support/commands.js
// Add custom Cypress commands here.
// Example: cy.login(), cy.getBySel() etc.

/**
 * cy.getBySel(selector)
 * Get an element by data-testid attribute for stable test selectors.
 */
Cypress.Commands.add('getBySel', (selector) => {
  return cy.get(`[data-testid="${selector}"]`);
});
