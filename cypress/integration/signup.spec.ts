describe('User Signup Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.visit('/auth')
  })

  it('should successfully sign up a new individual user', () => {
    // Navigate to signup tab
    cy.get('[data-cy="signup-tab"]').click()
    
    // Select individual user type
    cy.get('[data-cy="user-type-individual"]').click()
    cy.get('[data-cy="continue-button"]').click()
    
    // Fill signup form
    cy.get('[data-cy="first-name-input"]').type('John')
    cy.get('[data-cy="last-name-input"]').type('Doe')
    cy.get('[data-cy="email-input"]').type('john.doe@example.com')
    cy.get('[data-cy="password-input"]').type('Password123!')
    cy.get('[data-cy="terms-checkbox"]').check()
    
    // Mock email verification
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Registration successful. Please check your email.',
        userId: 1
      }
    }).as('registerUser')
    
    // Submit form
    cy.get('[data-cy="signup-submit"]').click()
    
    // Verify API call
    cy.wait('@registerUser')
    
    // Mock email verification click
    cy.intercept('GET', '/api/v1/auth/verify-email/*', {
      statusCode: 200,
      body: { success: true, message: 'Email verified successfully' }
    })
    
    // Simulate email verification
    cy.visit('/auth/verify-email/mock-token')
    
    // Should redirect to welcome/onboarding
    cy.url().should('include', '/onboarding')
    cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome')
  })

  it('should successfully sign up a new business user', () => {
    cy.get('[data-cy="signup-tab"]').click()
    
    // Select business user type
    cy.get('[data-cy="user-type-business"]').click()
    cy.get('[data-cy="continue-button"]').click()
    
    // Fill business signup form
    cy.get('[data-cy="business-name-input"]').type('Test Business LLC')
    cy.get('[data-cy="owner-name-input"]').type('Jane Smith')
    cy.get('[data-cy="email-input"]').type('jane@testbusiness.com')
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    cy.get('[data-cy="password-input"]').type('Business123!')
    cy.get('[data-cy="terms-checkbox"]').check()
    
    // Mock business registration
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Business registration submitted for review',
        userId: 2
      }
    }).as('registerBusiness')
    
    cy.get('[data-cy="signup-submit"]').click()
    cy.wait('@registerBusiness')
    
    // Should show pending approval message
    cy.get('[data-cy="pending-approval"]').should('be.visible')
    cy.get('[data-cy="pending-approval"]').should('contain', 'pending review')
  })

  it('should show validation errors for invalid input', () => {
    cy.get('[data-cy="signup-tab"]').click()
    cy.get('[data-cy="user-type-individual"]').click()
    cy.get('[data-cy="continue-button"]').click()
    
    // Try to submit empty form
    cy.get('[data-cy="signup-submit"]').click()
    
    // Should show validation errors
    cy.get('[data-cy="error-message"]').should('contain', 'required')
    
    // Test invalid email
    cy.get('[data-cy="email-input"]').type('invalid-email')
    cy.get('[data-cy="signup-submit"]').click()
    cy.get('[data-cy="error-message"]').should('contain', 'valid email')
    
    // Test weak password
    cy.get('[data-cy="email-input"]').clear().type('test@example.com')
    cy.get('[data-cy="password-input"]').type('weak')
    cy.get('[data-cy="signup-submit"]').click()
    cy.get('[data-cy="error-message"]').should('contain', 'password')
  })

  it('should handle existing user email error', () => {
    cy.get('[data-cy="signup-tab"]').click()
    cy.get('[data-cy="user-type-individual"]').click()
    cy.get('[data-cy="continue-button"]').click()
    
    cy.get('[data-cy="first-name-input"]').type('John')
    cy.get('[data-cy="last-name-input"]').type('Doe')
    cy.get('[data-cy="email-input"]').type('existing@example.com')
    cy.get('[data-cy="password-input"]').type('Password123!')
    cy.get('[data-cy="terms-checkbox"]').check()
    
    // Mock existing user error
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 400,
      body: { 
        success: false, 
        message: 'Email already exists'
      }
    }).as('registerExisting')
    
    cy.get('[data-cy="signup-submit"]').click()
    cy.wait('@registerExisting')
    
    cy.get('[data-cy="error-message"]').should('contain', 'already exists')
  })
})