describe('Mobile Phone Authentication Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.visit('/auth')
  })

  it('should successfully authenticate via SMS verification', () => {
    // Navigate to login tab
    cy.get('[data-cy="login-tab"]').click()
    
    // Switch to phone authentication
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    // Enter phone number
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    
    // Mock SMS sending
    cy.mockSMSVerification('+1234567890', '123456')
    
    // Click send code
    cy.get('[data-cy="send-code-button"]').click()
    cy.wait('@sendSMS')
    
    // Verify SMS sent message appears
    cy.get('[data-cy="sms-sent-message"]').should('be.visible')
    cy.get('[data-cy="sms-sent-message"]').should('contain', 'verification code sent')
    
    // Enter verification code
    cy.get('[data-cy="verification-code-input"]').type('123456')
    
    // Click verify
    cy.get('[data-cy="verify-button"]').click()
    cy.wait('@verifySMS')
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="user-dashboard"]').should('be.visible')
  })

  it('should handle invalid phone number format', () => {
    cy.get('[data-cy="login-tab"]').click()
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    // Enter invalid phone number with letters
    cy.get('[data-cy="phone-input"]').type('abc123def')
    cy.get('[data-cy="send-code-button"]').click()
    
    // Should show validation error
    cy.get('[data-cy="error-message"]').should('contain', 'valid phone number')
  })

  it('should handle SMS sending failure', () => {
    cy.get('[data-cy="login-tab"]').click()
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    
    // Mock SMS sending failure
    cy.intercept('POST', '/api/v1/auth/send-verification', {
      statusCode: 500,
      body: { success: false, message: 'Failed to send verification code' }
    }).as('sendSMSFail')
    
    cy.get('[data-cy="send-code-button"]').click()
    cy.wait('@sendSMSFail')
    
    cy.get('[data-cy="error-message"]').should('contain', 'Failed to send')
  })

  it('should handle invalid verification code', () => {
    cy.get('[data-cy="login-tab"]').click()
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    cy.mockSMSVerification('+1234567890')
    cy.get('[data-cy="send-code-button"]').click()
    cy.wait('@sendSMS')
    
    // Enter wrong code
    cy.get('[data-cy="verification-code-input"]').type('999999')
    
    // Mock verification failure
    cy.intercept('POST', '/api/v1/auth/verify-phone', {
      statusCode: 400,
      body: { success: false, message: 'Invalid verification code' }
    }).as('verifyFail')
    
    cy.get('[data-cy="verify-button"]').click()
    cy.wait('@verifyFail')
    
    cy.get('[data-cy="error-message"]').should('contain', 'Invalid verification code')
  })

  it('should allow resending verification code', () => {
    cy.get('[data-cy="login-tab"]').click()
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    cy.mockSMSVerification('+1234567890')
    cy.get('[data-cy="send-code-button"]').click()
    cy.wait('@sendSMS')
    
    // Click resend button (should appear after initial send)
    cy.get('[data-cy="resend-code-button"]').should('be.visible')
    cy.get('[data-cy="resend-code-button"]').click()
    cy.wait('@sendSMS')
    
    cy.get('[data-cy="sms-sent-message"]').should('contain', 'code sent')
  })

  it('should handle code expiration', () => {
    cy.get('[data-cy="login-tab"]').click()
    cy.get('[data-cy="phone-auth-toggle"]').click()
    
    cy.get('[data-cy="phone-input"]').type('+1234567890')
    cy.mockSMSVerification('+1234567890')
    cy.get('[data-cy="send-code-button"]').click()
    cy.wait('@sendSMS')
    
    cy.get('[data-cy="verification-code-input"]').type('123456')
    
    // Mock expired code response
    cy.intercept('POST', '/api/v1/auth/verify-phone', {
      statusCode: 400,
      body: { success: false, message: 'Verification code has expired' }
    }).as('verifyExpired')
    
    cy.get('[data-cy="verify-button"]').click()
    cy.wait('@verifyExpired')
    
    cy.get('[data-cy="error-message"]').should('contain', 'expired')
    cy.get('[data-cy="resend-code-button"]').should('be.visible')
  })
})