describe('Profile Update Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.loginAs('individual')
  })

  it('should successfully update user profile information', () => {
    // Navigate to profile page
    cy.visit('/profile')
    cy.waitForPageLoad()
    
    // Mock current user data
    cy.intercept('GET', '/api/v1/user/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        avatar: null,
        preferences: {
          notifications: true,
          newsletter: false
        }
      }
    }).as('getProfile')
    
    cy.wait('@getProfile')
    
    // Verify current information is loaded
    cy.get('[data-cy="first-name-input"]').should('have.value', 'John')
    cy.get('[data-cy="last-name-input"]').should('have.value', 'Doe')
    cy.get('[data-cy="email-input"]').should('have.value', 'john.doe@example.com')
    cy.get('[data-cy="phone-input"]').should('have.value', '+1234567890')
    
    // Update profile information
    cy.get('[data-cy="first-name-input"]').clear().type('Jane')
    cy.get('[data-cy="last-name-input"]').clear().type('Smith')
    cy.get('[data-cy="phone-input"]').clear().type('+1987654321')
    
    // Mock profile update API
    cy.intercept('PUT', '/api/v1/user/profile', {
      statusCode: 200,
      body: { 
        success: true, 
        user: {
          id: 1,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'john.doe@example.com',
          phone: '+1987654321'
        }
      }
    }).as('updateProfile')
    
    // Save changes
    cy.get('[data-cy="save-profile-button"]').click()
    cy.wait('@updateProfile')
    
    // Should show success message
    cy.get('[data-cy="success-message"]').should('contain', 'Profile updated successfully')
    
    // Refresh page and verify changes persisted
    cy.reload()
    cy.wait('@getProfile')
    
    cy.get('[data-cy="first-name-input"]').should('have.value', 'Jane')
    cy.get('[data-cy="last-name-input"]').should('have.value', 'Smith')
    cy.get('[data-cy="phone-input"]').should('have.value', '+1987654321')
  })

  it('should successfully upload and update avatar', () => {
    cy.visit('/profile')
    
    cy.intercept('GET', '/api/v1/user/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        avatar: null
      }
    }).as('getProfile')
    
    cy.wait('@getProfile')
    
    // Upload new avatar
    cy.fixture('avatar.jpg', 'base64').then(fileContent => {
      cy.get('[data-cy="avatar-upload"]').selectFile({
        contents: Cypress.Buffer.from(fileContent, 'base64'),
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
      }, { force: true })
    })
    
    // Mock image upload
    cy.intercept('POST', '/api/v1/upload/avatar', {
      statusCode: 200,
      body: { 
        success: true, 
        url: 'https://example.com/avatars/new-avatar.jpg'
      }
    }).as('uploadAvatar')
    
    cy.wait('@uploadAvatar')
    
    // Avatar preview should update
    cy.get('[data-cy="avatar-preview"]').should('be.visible')
    cy.get('[data-cy="avatar-preview"]').should('have.attr', 'src').and('include', 'new-avatar.jpg')
    
    // Mock profile update with new avatar
    cy.intercept('PUT', '/api/v1/user/profile', {
      statusCode: 200,
      body: { 
        success: true, 
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          avatar: 'https://example.com/avatars/new-avatar.jpg'
        }
      }
    }).as('updateProfileWithAvatar')
    
    cy.get('[data-cy="save-profile-button"]').click()
    cy.wait('@updateProfileWithAvatar')
    
    cy.get('[data-cy="success-message"]').should('contain', 'Profile updated successfully')
    
    // Refresh and verify avatar persisted
    cy.reload()
    cy.wait('@getProfile')
    cy.get('[data-cy="avatar-preview"]').should('have.attr', 'src').and('include', 'new-avatar.jpg')
  })

  it('should update notification preferences', () => {
    cy.visit('/profile/settings')
    
    cy.intercept('GET', '/api/v1/user/preferences', {
      statusCode: 200,
      body: {
        notifications: true,
        newsletter: false,
        dealAlerts: true,
        emailFrequency: 'weekly'
      }
    }).as('getPreferences')
    
    cy.wait('@getPreferences')
    
    // Verify current settings
    cy.get('[data-cy="notifications-toggle"]').should('be.checked')
    cy.get('[data-cy="newsletter-toggle"]').should('not.be.checked')
    cy.get('[data-cy="deal-alerts-toggle"]').should('be.checked')
    
    // Update preferences
    cy.get('[data-cy="newsletter-toggle"]').check()
    cy.get('[data-cy="deal-alerts-toggle"]').uncheck()
    cy.get('[data-cy="email-frequency-select"]').select('daily')
    
    // Mock preferences update
    cy.intercept('PUT', '/api/v1/user/preferences', {
      statusCode: 200,
      body: { success: true }
    }).as('updatePreferences')
    
    cy.get('[data-cy="save-preferences-button"]').click()
    cy.wait('@updatePreferences')
    
    cy.get('[data-cy="success-message"]').should('contain', 'Preferences updated')
    
    // Refresh and verify changes persisted
    cy.reload()
    cy.wait('@getPreferences')
    cy.get('[data-cy="newsletter-toggle"]').should('be.checked')
    cy.get('[data-cy="deal-alerts-toggle"]').should('not.be.checked')
  })

  it('should handle avatar upload errors', () => {
    cy.visit('/profile')
    
    cy.intercept('GET', '/api/v1/user/profile', {
      statusCode: 200,
      body: { id: 1, firstName: 'John', lastName: 'Doe' }
    }).as('getProfile')
    
    cy.wait('@getProfile')
    
    // Mock upload failure
    cy.intercept('POST', '/api/v1/upload/avatar', {
      statusCode: 400,
      body: { 
        success: false, 
        message: 'File too large. Maximum size is 5MB.'
      }
    }).as('uploadError')
    
    // Try to upload oversized file
    cy.get('[data-cy="avatar-upload"]').selectFile({
      contents: 'large file content'.repeat(1000),
      fileName: 'large-avatar.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    
    cy.wait('@uploadError')
    
    cy.get('[data-cy="error-message"]').should('contain', 'File too large')
  })

  it('should validate profile form fields', () => {
    cy.visit('/profile')
    
    cy.intercept('GET', '/api/v1/user/profile', {
      statusCode: 200,
      body: { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
    }).as('getProfile')
    
    cy.wait('@getProfile')
    
    // Clear required fields
    cy.get('[data-cy="first-name-input"]').clear()
    cy.get('[data-cy="last-name-input"]').clear()
    
    // Try to save
    cy.get('[data-cy="save-profile-button"]').click()
    
    // Should show validation errors
    cy.get('[data-cy="error-first-name"]').should('contain', 'required')
    cy.get('[data-cy="error-last-name"]').should('contain', 'required')
    
    // Test invalid phone format
    cy.get('[data-cy="first-name-input"]').type('John')
    cy.get('[data-cy="last-name-input"]').type('Doe')
    cy.get('[data-cy="phone-input"]').clear().type('invalid-phone')
    
    cy.get('[data-cy="save-profile-button"]').click()
    
    cy.get('[data-cy="error-phone"]').should('contain', 'valid phone number')
  })

  it('should handle password change', () => {
    cy.visit('/profile/security')
    
    // Fill password change form
    cy.get('[data-cy="current-password-input"]').type('CurrentPass123!')
    cy.get('[data-cy="new-password-input"]').type('NewPassword456!')
    cy.get('[data-cy="confirm-password-input"]').type('NewPassword456!')
    
    // Mock password change API
    cy.intercept('PUT', '/api/v1/user/change-password', {
      statusCode: 200,
      body: { success: true, message: 'Password updated successfully' }
    }).as('changePassword')
    
    cy.get('[data-cy="change-password-button"]').click()
    cy.wait('@changePassword')
    
    cy.get('[data-cy="success-message"]').should('contain', 'Password updated successfully')
    
    // Form should be cleared
    cy.get('[data-cy="current-password-input"]').should('have.value', '')
    cy.get('[data-cy="new-password-input"]').should('have.value', '')
    cy.get('[data-cy="confirm-password-input"]').should('have.value', '')
  })

  it('should validate password change requirements', () => {
    cy.visit('/profile/security')
    
    // Test password mismatch
    cy.get('[data-cy="current-password-input"]').type('CurrentPass123!')
    cy.get('[data-cy="new-password-input"]').type('NewPassword456!')
    cy.get('[data-cy="confirm-password-input"]').type('DifferentPassword789!')
    
    cy.get('[data-cy="change-password-button"]').click()
    
    cy.get('[data-cy="error-password-match"]').should('contain', 'Passwords do not match')
    
    // Test weak password
    cy.get('[data-cy="new-password-input"]').clear().type('weak')
    cy.get('[data-cy="confirm-password-input"]').clear().type('weak')
    
    cy.get('[data-cy="change-password-button"]').click()
    
    cy.get('[data-cy="error-password-strength"]').should('contain', 'Password must be at least 8 characters')
  })

  it('should delete account with confirmation', () => {
    cy.visit('/profile/security')
    
    // Click delete account button
    cy.get('[data-cy="delete-account-button"]').click()
    
    // Confirmation modal should appear
    cy.get('[data-cy="delete-confirmation-modal"]').should('be.visible')
    cy.get('[data-cy="delete-warning"]').should('contain', 'This action cannot be undone')
    
    // Type confirmation text
    cy.get('[data-cy="delete-confirmation-input"]').type('DELETE MY ACCOUNT')
    
    // Mock account deletion
    cy.intercept('DELETE', '/api/v1/user/account', {
      statusCode: 200,
      body: { success: true, message: 'Account deleted successfully' }
    }).as('deleteAccount')
    
    cy.get('[data-cy="confirm-delete-button"]').click()
    cy.wait('@deleteAccount')
    
    // Should redirect to homepage or goodbye page
    cy.url().should('not.include', '/profile')
    cy.get('[data-cy="account-deleted-message"]').should('be.visible')
  })
})