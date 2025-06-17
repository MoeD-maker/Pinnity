// Custom Cypress commands for Pinnity app testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as different user types
       */
      loginAs(userType: 'individual' | 'business' | 'admin', credentials?: { email?: string; password?: string; phone?: string }): Chainable<Element>
      
      /**
       * Custom command to clear all application data
       */
      clearAppData(): Chainable<Element>
      
      /**
       * Custom command to seed test data
       */
      seedTestData(): Chainable<Element>
      
      /**
       * Custom command to mock SMS verification
       */
      mockSMSVerification(phoneNumber: string, code?: string): Chainable<Element>
      
      /**
       * Custom command to wait for page to be fully loaded
       */
      waitForPageLoad(): Chainable<Element>
    }
  }
}

// Login command with different user types
Cypress.Commands.add('loginAs', (userType: 'individual' | 'business' | 'admin', credentials = {}) => {
  const defaultCredentials = {
    individual: { email: 'test@user.com', password: 'Test123!', phone: '+1234567890' },
    business: { email: 'vendor@test.com', password: 'Vendor123!', phone: '+1234567891' },
    admin: { email: 'admin@test.com', password: 'Admin123!', phone: '+1234567892' }
  }
  
  const creds = { ...defaultCredentials[userType], ...credentials }
  
  cy.visit('/auth')
  cy.get('[data-cy="login-tab"]').click()
  cy.get('[data-cy="email-input"]').type(creds.email)
  cy.get('[data-cy="password-input"]').type(creds.password)
  cy.get('[data-cy="login-submit"]').click()
  
  // Wait for successful login
  cy.url().should('not.include', '/auth')
  cy.waitForPageLoad()
})

// Clear application data
Cypress.Commands.add('clearAppData', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
  
  // Clear cookies
  cy.clearCookies()
  
  // Clear any IndexedDB data if used
  cy.clearLocalStorage()
})

// Seed test data via API
Cypress.Commands.add('seedTestData', () => {
  cy.request({
    method: 'POST',
    url: '/api/test/seed-data',
    failOnStatusCode: false
  })
})

// Mock SMS verification
Cypress.Commands.add('mockSMSVerification', (phoneNumber: string, code = '123456') => {
  cy.intercept('POST', '/api/v1/auth/send-verification', {
    statusCode: 200,
    body: { success: true, message: 'Verification code sent' }
  }).as('sendSMS')
  
  cy.intercept('POST', '/api/v1/auth/verify-phone', {
    statusCode: 200,
    body: { 
      success: true, 
      user: { id: 1, phone: phoneNumber, verified: true },
      token: 'mock-jwt-token'
    }
  }).as('verifySMS')
})

// Wait for page to fully load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body', { timeout: 10000 }).should('be.visible')
  cy.window().its('document.readyState').should('equal', 'complete')
  
  // Wait for any loading spinners to disappear
  cy.get('[data-cy="loading"]', { timeout: 1000 }).should('not.exist')
  cy.get('.loading', { timeout: 1000 }).should('not.exist')
})