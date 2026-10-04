describe('QueueLess UI Navigation & Flows', () => {
  it('loads the home page successfully', () => {
    cy.visit('/');
    cy.contains('QueueLess');
    cy.contains('Take a token');
  });

  it('navigates to staff login', () => {
    cy.visit('/');
    cy.get('a[href="/staff/login"]').click();
    cy.url().should('include', '/staff/login');
    cy.contains('Staff login');
  });

  it('verifies language selector exists (Hindi/English)', () => {
    cy.visit('/');
    // Check if EN/HI language dropdown is present
    cy.contains('EN').click();
    cy.contains('हिन्दी (Hindi)');
  });

  it('allows selecting a queue and viewing estimate', () => {
    cy.visit('/take');
    cy.get('button').first().click(); // Click first industry queue
    cy.contains('Wait estimate');
    cy.contains('Take token');
  });
});
