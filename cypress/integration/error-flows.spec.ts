describe('Error Handling Flows', () => {
  beforeEach(() => {
    cy.clearAppData()
  })

  describe('Signup Validation Errors', () => {
    beforeEach(() => {
      cy.visit('/auth')
      cy.get('[data-cy="signup-tab"]').click()
      cy.get('[data-cy="user-type-individual"]').click()
      cy.get('[data-cy="continue-button"]').click()
    })

    it('should show error for invalid email format', () => {
      cy.get('[data-cy="first-name-input"]').type('John')
      cy.get('[data-cy="last-name-input"]').type('Doe')
      cy.get('[data-cy="email-input"]').type('invalid-email-format')
      cy.get('[data-cy="password-input"]').type('ValidPass123!')
      cy.get('[data-cy="terms-checkbox"]').check()
      
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.get('[data-cy="error-email"]').should('be.visible')
      cy.get('[data-cy="error-email"]').should('contain', 'valid email')
    })

    it('should show error for weak password', () => {
      cy.get('[data-cy="first-name-input"]').type('John')
      cy.get('[data-cy="last-name-input"]').type('Doe')
      cy.get('[data-cy="email-input"]').type('john@example.com')
      cy.get('[data-cy="password-input"]').type('weak')
      cy.get('[data-cy="terms-checkbox"]').check()
      
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.get('[data-cy="error-password"]').should('be.visible')
      cy.get('[data-cy="error-password"]').should('contain', 'at least 8 characters')
    })

    it('should show error for missing required fields', () => {
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.get('[data-cy="error-first-name"]').should('contain', 'required')
      cy.get('[data-cy="error-last-name"]').should('contain', 'required')
      cy.get('[data-cy="error-email"]').should('contain', 'required')
      cy.get('[data-cy="error-password"]').should('contain', 'required')
    })

    it('should show error for unchecked terms', () => {
      cy.get('[data-cy="first-name-input"]').type('John')
      cy.get('[data-cy="last-name-input"]').type('Doe')
      cy.get('[data-cy="email-input"]').type('john@example.com')
      cy.get('[data-cy="password-input"]').type('ValidPass123!')
      // Don't check terms checkbox
      
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.get('[data-cy="error-terms"]').should('be.visible')
      cy.get('[data-cy="error-terms"]').should('contain', 'accept the terms')
    })
  })

  describe('Phone Validation Errors', () => {
    beforeEach(() => {
      cy.visit('/auth')
      cy.get('[data-cy="login-tab"]').click()
      cy.get('[data-cy="phone-auth-toggle"]').click()
    })

    it('should show error for phone with letters', () => {
      cy.get('[data-cy="phone-input"]').type('abc123def')
      cy.get('[data-cy="send-code-button"]').click()
      
      cy.get('[data-cy="error-phone"]').should('be.visible')
      cy.get('[data-cy="error-phone"]').should('contain', 'valid phone number')
    })

    it('should show error for too short phone number', () => {
      cy.get('[data-cy="phone-input"]').type('123')
      cy.get('[data-cy="send-code-button"]').click()
      
      cy.get('[data-cy="error-phone"]').should('be.visible')
      cy.get('[data-cy="error-phone"]').should('contain', 'valid phone number')
    })

    it('should show error for phone with special characters', () => {
      cy.get('[data-cy="phone-input"]').type('123-456-7890#ext123')
      cy.get('[data-cy="send-code-button"]').click()
      
      cy.get('[data-cy="error-phone"]').should('be.visible')
      cy.get('[data-cy="error-phone"]').should('contain', 'valid phone number')
    })

    it('should show error for empty phone field', () => {
      cy.get('[data-cy="send-code-button"]').click()
      
      cy.get('[data-cy="error-phone"]').should('be.visible')
      cy.get('[data-cy="error-phone"]').should('contain', 'required')
    })
  })

  describe('Deal Creation Form Errors', () => {
    beforeEach(() => {
      cy.clearAppData()
      cy.loginAs('business')
      cy.visit('/vendor/deals/new')
    })

    it('should show errors for missing required fields', () => {
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-title"]').should('contain', 'required')
      cy.get('[data-cy="error-description"]').should('contain', 'required')
      cy.get('[data-cy="error-category"]').should('contain', 'required')
      cy.get('[data-cy="error-original-price"]').should('contain', 'required')
      cy.get('[data-cy="error-discounted-price"]').should('contain', 'required')
    })

    it('should show error for negative prices', () => {
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="original-price-input"]').type('-10')
      cy.get('[data-cy="discounted-price-input"]').type('-5')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-original-price"]').should('contain', 'positive number')
      cy.get('[data-cy="error-discounted-price"]').should('contain', 'positive number')
    })

    it('should show error when discounted price is higher than original', () => {
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="original-price-input"]').type('10')
      cy.get('[data-cy="discounted-price-input"]').type('15')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-price-logic"]').should('be.visible')
      cy.get('[data-cy="error-price-logic"]').should('contain', 'discounted price must be less than original price')
    })

    it('should show error for invalid date range', () => {
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="start-date-input"]').type('2025-12-31')
      cy.get('[data-cy="end-date-input"]').type('2025-01-01')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-date-range"]').should('be.visible')
      cy.get('[data-cy="error-date-range"]').should('contain', 'end date must be after start date')
    })

    it('should show error for past start date', () => {
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="start-date-input"]').type('2020-01-01')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-start-date"]').should('be.visible')
      cy.get('[data-cy="error-start-date"]').should('contain', 'start date cannot be in the past')
    })

    it('should show error for invalid quantity', () => {
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="quantity-input"]').type('0')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      
      cy.get('[data-cy="error-quantity"]').should('be.visible')
      cy.get('[data-cy="error-quantity"]').should('contain', 'quantity must be at least 1')
    })
  })

  describe('Network Error Handling', () => {
    it('should handle login API failure gracefully', () => {
      cy.visit('/auth')
      cy.get('[data-cy="login-tab"]').click()
      
      // Mock network error
      cy.intercept('POST', '/api/v1/auth/login', {
        forceNetworkError: true
      }).as('loginNetworkError')
      
      cy.get('[data-cy="email-input"]').type('test@example.com')
      cy.get('[data-cy="password-input"]').type('Password123!')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.wait('@loginNetworkError')
      cy.get('[data-cy="error-message"]').should('contain', 'network error')
      cy.get('[data-cy="retry-button"]').should('be.visible')
    })

    it('should handle server 500 error during signup', () => {
      cy.visit('/auth')
      cy.get('[data-cy="signup-tab"]').click()
      cy.get('[data-cy="user-type-individual"]').click()
      cy.get('[data-cy="continue-button"]').click()
      
      // Mock server error
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 500,
        body: { success: false, message: 'Internal server error' }
      }).as('serverError')
      
      cy.get('[data-cy="first-name-input"]').type('John')
      cy.get('[data-cy="last-name-input"]').type('Doe')
      cy.get('[data-cy="email-input"]').type('john@example.com')
      cy.get('[data-cy="password-input"]').type('Password123!')
      cy.get('[data-cy="terms-checkbox"]').check()
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.wait('@serverError')
      cy.get('[data-cy="error-message"]').should('contain', 'server error')
    })

    it('should handle timeout during deal creation', () => {
      cy.loginAs('business')
      cy.visit('/vendor/deals/new')
      
      // Mock timeout
      cy.intercept('POST', '/api/v1/vendor/deals', {
        delay: 30000 // Causes timeout
      }).as('dealTimeout')
      
      cy.get('[data-cy="deal-title-input"]').type('Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Test Description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      cy.get('[data-cy="original-price-input"]').type('10')
      cy.get('[data-cy="discounted-price-input"]').type('8')
      cy.get('[data-cy="create-deal-submit"]').click()
      
      // Should show loading state then timeout error
      cy.get('[data-cy="loading-spinner"]').should('be.visible')
      cy.get('[data-cy="error-message"]', { timeout: 35000 }).should('contain', 'timeout')
    })
  })

  describe('Validation Edge Cases', () => {
    it('should handle very long input text', () => {
      cy.visit('/auth')
      cy.get('[data-cy="signup-tab"]').click()
      cy.get('[data-cy="user-type-individual"]').click()
      cy.get('[data-cy="continue-button"]').click()
      
      const longText = 'a'.repeat(1000)
      
      cy.get('[data-cy="first-name-input"]').type(longText)
      cy.get('[data-cy="signup-submit"]').click()
      
      cy.get('[data-cy="error-first-name"]').should('contain', 'too long')
    })

    it('should handle SQL injection attempts', () => {
      cy.visit('/auth')
      cy.get('[data-cy="login-tab"]').click()
      
      const sqlInjection = "'; DROP TABLE users; --"
      
      cy.get('[data-cy="email-input"]').type(sqlInjection)
      cy.get('[data-cy="password-input"]').type('password')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="error-email"]').should('contain', 'valid email')
    })

    it('should handle XSS attempts in form fields', () => {
      cy.loginAs('business')
      cy.visit('/vendor/deals/new')
      
      const xssAttempt = '<script>alert("xss")</script>'
      
      cy.get('[data-cy="deal-title-input"]').type(xssAttempt)
      cy.get('[data-cy="deal-description-input"]').type('Valid description')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      
      // Mock API response that shows proper sanitization
      cy.intercept('POST', '/api/v1/vendor/deals', {
        statusCode: 400,
        body: { 
          success: false, 
          message: 'Invalid characters in title field' 
        }
      }).as('xssBlocked')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      cy.wait('@xssBlocked')
      
      cy.get('[data-cy="error-title"]').should('contain', 'Invalid characters')
    })
  })

  describe('File Upload Errors', () => {
    it('should show error for unsupported file type', () => {
      cy.loginAs('business')
      cy.visit('/vendor/deals/new')
      
      // Try to upload a text file as deal image
      cy.get('[data-cy="deal-image-upload"]').selectFile({
        contents: 'This is not an image',
        fileName: 'document.txt',
        mimeType: 'text/plain',
      }, { force: true })
      
      cy.get('[data-cy="error-file-type"]').should('be.visible')
      cy.get('[data-cy="error-file-type"]').should('contain', 'supported file types')
    })

    it('should show error for file size too large', () => {
      cy.loginAs('individual')
      cy.visit('/profile')
      
      // Mock large file upload error
      cy.intercept('POST', '/api/v1/upload/avatar', {
        statusCode: 413,
        body: { 
          success: false, 
          message: 'File size exceeds 5MB limit' 
        }
      }).as('fileTooLarge')
      
      cy.get('[data-cy="avatar-upload"]').selectFile({
        contents: 'x'.repeat(1000000), // Large content
        fileName: 'large-avatar.jpg',
        mimeType: 'image/jpeg',
      }, { force: true })
      
      cy.wait('@fileTooLarge')
      cy.get('[data-cy="error-file-size"]').should('contain', '5MB limit')
    })
  })

  describe('Session Expiration Handling', () => {
    it('should handle expired session during form submission', () => {
      cy.loginAs('business')
      cy.visit('/vendor/deals/new')
      
      // Fill form
      cy.get('[data-cy="deal-title-input"]').type('Session Test Deal')
      cy.get('[data-cy="deal-description-input"]').type('Testing session expiration')
      cy.get('[data-cy="category-select"]').click()
      cy.get('[data-cy="category-option-food"]').click()
      
      // Mock session expired response
      cy.intercept('POST', '/api/v1/vendor/deals', {
        statusCode: 401,
        body: { 
          success: false, 
          message: 'Session expired. Please log in again.' 
        }
      }).as('sessionExpired')
      
      cy.get('[data-cy="create-deal-submit"]').click()
      cy.wait('@sessionExpired')
      
      // Should redirect to login
      cy.url().should('include', '/auth')
      cy.get('[data-cy="session-expired-message"]').should('contain', 'session expired')
    })
  })
})