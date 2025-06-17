// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configure global test settings
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that might occur during development
  console.warn('Uncaught exception:', err)
  return false
})

// Set default viewport for consistent testing
beforeEach(() => {
  cy.viewport(1280, 720)
})