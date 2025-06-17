describe('Deal Redemption Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.loginAs('individual')
  })

  it('should successfully redeem a deal', () => {
    const dealId = 1
    
    // Mock deal data
    cy.intercept('GET', `/api/v1/deals/${dealId}`, {
      statusCode: 200,
      body: {
        id: dealId,
        title: '20% Off Coffee Drinks',
        description: 'Great coffee deal',
        originalPrice: 5.00,
        discountedPrice: 4.00,
        quantityAvailable: 10,
        business: {
          id: 1,
          businessName: 'Coffee Shop',
          address: '123 Main St'
        },
        status: 'approved',
        redeemed: false
      }
    }).as('getDeal')
    
    // Visit deal detail page
    cy.visit(`/deals/${dealId}`)
    cy.wait('@getDeal')
    cy.waitForPageLoad()
    
    // Verify deal information
    cy.get('[data-cy="deal-title"]').should('contain', '20% Off Coffee Drinks')
    cy.get('[data-cy="deal-price"]').should('contain', '$4.00')
    cy.get('[data-cy="original-price"]').should('contain', '$5.00')
    cy.get('[data-cy="quantity-available"]').should('contain', '10')
    cy.get('[data-cy="business-name"]').should('contain', 'Coffee Shop')
    
    // Mock redemption API
    cy.intercept('POST', `/api/v1/deals/${dealId}/redeem`, {
      statusCode: 200,
      body: { 
        success: true, 
        redemptionCode: 'REDEEM123',
        message: 'Deal redeemed successfully'
      }
    }).as('redeemDeal')
    
    // Mock updated deal data with decremented quantity
    cy.intercept('GET', `/api/v1/deals/${dealId}`, {
      statusCode: 200,
      body: {
        id: dealId,
        title: '20% Off Coffee Drinks',
        description: 'Great coffee deal',
        originalPrice: 5.00,
        discountedPrice: 4.00,
        quantityAvailable: 9,
        business: {
          id: 1,
          businessName: 'Coffee Shop',
          address: '123 Main St'
        },
        status: 'approved',
        redeemed: true
      }
    }).as('getUpdatedDeal')
    
    // Click redeem button
    cy.get('[data-cy="redeem-button"]').should('be.visible')
    cy.get('[data-cy="redeem-button"]').click()
    cy.wait('@redeemDeal')
    
    // Should show success message and redemption code
    cy.get('[data-cy="success-message"]').should('contain', 'redeemed successfully')
    cy.get('[data-cy="redemption-code"]').should('contain', 'REDEEM123')
    
    // Refresh page to verify quantity decremented
    cy.reload()
    cy.wait('@getUpdatedDeal')
    cy.get('[data-cy="quantity-available"]').should('contain', '9')
    cy.get('[data-cy="redeem-button"]').should('not.exist')
    cy.get('[data-cy="already-redeemed"]').should('be.visible')
  })

  it('should prevent redeeming when deal is out of stock', () => {
    const dealId = 2
    
    cy.intercept('GET', `/api/v1/deals/${dealId}`, {
      statusCode: 200,
      body: {
        id: dealId,
        title: 'Sold Out Deal',
        description: 'This deal is sold out',
        originalPrice: 10.00,
        discountedPrice: 8.00,
        quantityAvailable: 0,
        business: { businessName: 'Test Shop' },
        status: 'approved',
        redeemed: false
      }
    }).as('getSoldOutDeal')
    
    cy.visit(`/deals/${dealId}`)
    cy.wait('@getSoldOutDeal')
    
    cy.get('[data-cy="quantity-available"]').should('contain', '0')
    cy.get('[data-cy="redeem-button"]').should('not.exist')
    cy.get('[data-cy="sold-out-message"]').should('be.visible')
    cy.get('[data-cy="sold-out-message"]').should('contain', 'sold out')
  })

  it('should prevent duplicate redemption by same user', () => {
    const dealId = 3
    
    cy.intercept('GET', `/api/v1/deals/${dealId}`, {
      statusCode: 200,
      body: {
        id: dealId,
        title: 'Already Redeemed Deal',
        description: 'User already redeemed this',
        originalPrice: 15.00,
        discountedPrice: 12.00,
        quantityAvailable: 5,
        business: { businessName: 'Test Shop' },
        status: 'approved',
        redeemed: true
      }
    }).as('getRedeemedDeal')
    
    cy.visit(`/deals/${dealId}`)
    cy.wait('@getRedeemedDeal')
    
    cy.get('[data-cy="redeem-button"]').should('not.exist')
    cy.get('[data-cy="already-redeemed"]').should('be.visible')
    cy.get('[data-cy="already-redeemed"]').should('contain', 'already redeemed')
  })

  it('should handle redemption API errors gracefully', () => {
    const dealId = 4
    
    cy.intercept('GET', `/api/v1/deals/${dealId}`, {
      statusCode: 200,
      body: {
        id: dealId,
        title: 'Error Deal',
        description: 'This will cause an error',
        originalPrice: 20.00,
        discountedPrice: 16.00,
        quantityAvailable: 3,
        business: { businessName: 'Test Shop' },
        status: 'approved',
        redeemed: false
      }
    }).as('getDeal')
    
    cy.visit(`/deals/${dealId}`)
    cy.wait('@getDeal')
    
    // Mock redemption error
    cy.intercept('POST', `/api/v1/deals/${dealId}/redeem`, {
      statusCode: 500,
      body: { 
        success: false, 
        message: 'Server error during redemption'
      }
    }).as('redeemError')
    
    cy.get('[data-cy="redeem-button"]').click()
    cy.wait('@redeemError')
    
    cy.get('[data-cy="error-message"]').should('contain', 'Server error during redemption')
    cy.get('[data-cy="redeem-button"]').should('be.visible') // Button should still be available for retry
  })

  it('should show redemption history for user', () => {
    cy.visit('/profile/redemptions')
    
    // Mock user redemption history
    cy.intercept('GET', '/api/v1/user/redemptions', {
      statusCode: 200,
      body: {
        redemptions: [
          {
            id: 1,
            deal: {
              id: 1,
              title: '20% Off Coffee',
              business: { businessName: 'Coffee Shop' }
            },
            redemptionCode: 'REDEEM123',
            redeemedAt: '2025-01-01T10:00:00Z',
            usedAt: null
          },
          {
            id: 2,
            deal: {
              id: 2,
              title: 'Pizza Special',
              business: { businessName: 'Pizza Place' }
            },
            redemptionCode: 'PIZZA456',
            redeemedAt: '2024-12-30T15:30:00Z',
            usedAt: '2024-12-30T16:00:00Z'
          }
        ]
      }
    }).as('getRedemptions')
    
    cy.wait('@getRedemptions')
    
    // Verify redemption history display
    cy.get('[data-cy="redemption-item-1"]').should('contain', '20% Off Coffee')
    cy.get('[data-cy="redemption-code-1"]').should('contain', 'REDEEM123')
    cy.get('[data-cy="redemption-status-1"]').should('contain', 'Active')
    
    cy.get('[data-cy="redemption-item-2"]').should('contain', 'Pizza Special')
    cy.get('[data-cy="redemption-code-2"]').should('contain', 'PIZZA456')
    cy.get('[data-cy="redemption-status-2"]').should('contain', 'Used')
  })

  it('should allow vendor to mark redemption as used', () => {
    cy.clearAppData()
    cy.loginAs('business')
    
    cy.visit('/vendor/redemptions')
    
    // Mock vendor's redemptions
    cy.intercept('GET', '/api/v1/vendor/redemptions', {
      statusCode: 200,
      body: {
        redemptions: [
          {
            id: 1,
            deal: { title: '20% Off Coffee' },
            user: { firstName: 'John', lastName: 'Doe' },
            redemptionCode: 'REDEEM123',
            redeemedAt: '2025-01-01T10:00:00Z',
            usedAt: null,
            status: 'active'
          }
        ]
      }
    }).as('getVendorRedemptions')
    
    cy.wait('@getVendorRedemptions')
    
    cy.get('[data-cy="redemption-item-1"]').should('be.visible')
    cy.get('[data-cy="mark-used-button-1"]').should('be.visible')
    
    // Mock marking as used
    cy.intercept('PUT', '/api/v1/vendor/redemptions/1/mark-used', {
      statusCode: 200,
      body: { success: true }
    }).as('markUsed')
    
    cy.get('[data-cy="mark-used-button-1"]').click()
    cy.wait('@markUsed')
    
    cy.get('[data-cy="success-message"]').should('contain', 'marked as used')
  })

  it('should validate redemption code lookup', () => {
    cy.clearAppData()
    cy.loginAs('business')
    
    cy.visit('/vendor/validate-redemption')
    
    // Enter redemption code
    cy.get('[data-cy="redemption-code-input"]').type('REDEEM123')
    
    // Mock code validation
    cy.intercept('POST', '/api/v1/vendor/validate-redemption', {
      statusCode: 200,
      body: {
        valid: true,
        redemption: {
          id: 1,
          deal: { title: '20% Off Coffee' },
          user: { firstName: 'John', lastName: 'Doe' },
          redeemedAt: '2025-01-01T10:00:00Z',
          usedAt: null
        }
      }
    }).as('validateCode')
    
    cy.get('[data-cy="validate-button"]').click()
    cy.wait('@validateCode')
    
    // Should show redemption details
    cy.get('[data-cy="redemption-details"]').should('be.visible')
    cy.get('[data-cy="customer-name"]').should('contain', 'John Doe')
    cy.get('[data-cy="deal-title"]').should('contain', '20% Off Coffee')
    cy.get('[data-cy="redemption-status"]').should('contain', 'Valid')
  })
})