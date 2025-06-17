describe('Admin Deal Approval Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.loginAs('admin')
  })

  it('should successfully approve a pending deal', () => {
    // Navigate to admin deals page
    cy.visit('/admin/deals')
    cy.waitForPageLoad()
    
    // Mock pending deals data
    cy.intercept('GET', '/api/v1/admin/deals*', {
      statusCode: 200,
      body: {
        deals: [
          {
            id: 1,
            title: '20% Off Coffee Drinks',
            description: 'Great coffee deal',
            status: 'pending',
            business: { businessName: 'Coffee Shop' },
            createdAt: '2025-01-01T10:00:00Z'
          }
        ]
      }
    }).as('getPendingDeals')
    
    cy.wait('@getPendingDeals')
    
    // Verify pending deal is visible
    cy.get('[data-cy="pending-deals-section"]').should('be.visible')
    cy.get('[data-cy="deal-item-1"]').should('contain', '20% Off Coffee Drinks')
    cy.get('[data-cy="deal-status-pending"]').should('be.visible')
    
    // Click to view deal details
    cy.get('[data-cy="view-deal-1"]').click()
    
    // Deal details modal should open
    cy.get('[data-cy="deal-details-modal"]').should('be.visible')
    cy.get('[data-cy="deal-title"]').should('contain', '20% Off Coffee Drinks')
    cy.get('[data-cy="business-name"]').should('contain', 'Coffee Shop')
    
    // Mock approval API
    cy.intercept('PUT', '/api/v1/admin/deals/1/approve', {
      statusCode: 200,
      body: { 
        success: true, 
        deal: { id: 1, status: 'approved' }
      }
    }).as('approveDeal')
    
    // Approve the deal
    cy.get('[data-cy="approve-deal-button"]').click()
    cy.wait('@approveDeal')
    
    // Should show success message
    cy.get('[data-cy="success-message"]').should('contain', 'Deal approved successfully')
    
    // Modal should close and deal should move to approved section
    cy.get('[data-cy="deal-details-modal"]').should('not.exist')
    cy.get('[data-cy="approved-deals-section"]').should('contain', '20% Off Coffee Drinks')
    cy.get('[data-cy="deal-status-approved"]').should('be.visible')
  })

  it('should successfully reject a pending deal with reason', () => {
    cy.visit('/admin/deals')
    
    cy.intercept('GET', '/api/v1/admin/deals*', {
      statusCode: 200,
      body: {
        deals: [
          {
            id: 2,
            title: 'Invalid Deal',
            description: 'This deal violates terms',
            status: 'pending',
            business: { businessName: 'Test Business' }
          }
        ]
      }
    }).as('getPendingDeals')
    
    cy.wait('@getPendingDeals')
    
    cy.get('[data-cy="view-deal-2"]').click()
    cy.get('[data-cy="deal-details-modal"]').should('be.visible')
    
    // Click reject button
    cy.get('[data-cy="reject-deal-button"]').click()
    
    // Rejection modal should appear
    cy.get('[data-cy="rejection-modal"]').should('be.visible')
    cy.get('[data-cy="rejection-reason-input"]').type('Deal description violates community guidelines')
    
    // Mock rejection API
    cy.intercept('PUT', '/api/v1/admin/deals/2/reject', {
      statusCode: 200,
      body: { 
        success: true, 
        deal: { id: 2, status: 'rejected' }
      }
    }).as('rejectDeal')
    
    cy.get('[data-cy="confirm-rejection-button"]').click()
    cy.wait('@rejectDeal')
    
    cy.get('[data-cy="success-message"]').should('contain', 'Deal rejected')
    cy.get('[data-cy="rejected-deals-section"]').should('contain', 'Invalid Deal')
  })

  it('should filter deals by status', () => {
    cy.visit('/admin/deals')
    
    // Mock deals with different statuses
    cy.intercept('GET', '/api/v1/admin/deals*', {
      statusCode: 200,
      body: {
        deals: [
          { id: 1, title: 'Pending Deal', status: 'pending', business: { businessName: 'Shop 1' } },
          { id: 2, title: 'Approved Deal', status: 'approved', business: { businessName: 'Shop 2' } },
          { id: 3, title: 'Rejected Deal', status: 'rejected', business: { businessName: 'Shop 3' } }
        ]
      }
    }).as('getAllDeals')
    
    cy.wait('@getAllDeals')
    
    // Test pending filter
    cy.get('[data-cy="filter-pending"]').click()
    cy.get('[data-cy="deal-item-1"]').should('be.visible')
    cy.get('[data-cy="deal-item-2"]').should('not.exist')
    cy.get('[data-cy="deal-item-3"]').should('not.exist')
    
    // Test approved filter
    cy.get('[data-cy="filter-approved"]').click()
    cy.get('[data-cy="deal-item-1"]').should('not.exist')
    cy.get('[data-cy="deal-item-2"]').should('be.visible')
    cy.get('[data-cy="deal-item-3"]').should('not.exist')
    
    // Test rejected filter
    cy.get('[data-cy="filter-rejected"]').click()
    cy.get('[data-cy="deal-item-1"]').should('not.exist')
    cy.get('[data-cy="deal-item-2"]').should('not.exist')
    cy.get('[data-cy="deal-item-3"]').should('be.visible')
    
    // Test all filter
    cy.get('[data-cy="filter-all"]').click()
    cy.get('[data-cy="deal-item-1"]').should('be.visible')
    cy.get('[data-cy="deal-item-2"]').should('be.visible')
    cy.get('[data-cy="deal-item-3"]').should('be.visible')
  })

  it('should search deals by title or business name', () => {
    cy.visit('/admin/deals')
    
    cy.intercept('GET', '/api/v1/admin/deals*', {
      statusCode: 200,
      body: {
        deals: [
          { id: 1, title: 'Coffee Special', status: 'pending', business: { businessName: 'Coffee Shop' } },
          { id: 2, title: 'Pizza Deal', status: 'pending', business: { businessName: 'Pizza Place' } }
        ]
      }
    }).as('getAllDeals')
    
    cy.wait('@getAllDeals')
    
    // Search by title
    cy.get('[data-cy="search-input"]').type('Coffee')
    cy.get('[data-cy="deal-item-1"]').should('be.visible')
    cy.get('[data-cy="deal-item-2"]').should('not.exist')
    
    // Clear and search by business name
    cy.get('[data-cy="search-input"]').clear().type('Pizza')
    cy.get('[data-cy="deal-item-1"]').should('not.exist')
    cy.get('[data-cy="deal-item-2"]').should('be.visible')
  })

  it('should handle bulk approval of multiple deals', () => {
    cy.visit('/admin/deals')
    
    cy.intercept('GET', '/api/v1/admin/deals*', {
      statusCode: 200,
      body: {
        deals: [
          { id: 1, title: 'Deal 1', status: 'pending', business: { businessName: 'Shop 1' } },
          { id: 2, title: 'Deal 2', status: 'pending', business: { businessName: 'Shop 2' } },
          { id: 3, title: 'Deal 3', status: 'pending', business: { businessName: 'Shop 3' } }
        ]
      }
    }).as('getAllDeals')
    
    cy.wait('@getAllDeals')
    
    // Select multiple deals
    cy.get('[data-cy="select-deal-1"]').check()
    cy.get('[data-cy="select-deal-2"]').check()
    
    // Bulk actions should be available
    cy.get('[data-cy="bulk-actions"]').should('be.visible')
    
    // Mock bulk approval
    cy.intercept('PUT', '/api/v1/admin/deals/bulk-approve', {
      statusCode: 200,
      body: { success: true, approved: [1, 2] }
    }).as('bulkApprove')
    
    cy.get('[data-cy="bulk-approve-button"]').click()
    cy.wait('@bulkApprove')
    
    cy.get('[data-cy="success-message"]').should('contain', '2 deals approved')
  })

  it('should show deal analytics and statistics', () => {
    cy.visit('/admin/deals')
    
    // Mock analytics data
    cy.intercept('GET', '/api/v1/admin/analytics/deals', {
      statusCode: 200,
      body: {
        totalDeals: 150,
        pendingDeals: 12,
        approvedDeals: 120,
        rejectedDeals: 18,
        averageApprovalTime: '2.5 hours'
      }
    }).as('getAnalytics')
    
    cy.wait('@getAnalytics')
    
    // Check analytics display
    cy.get('[data-cy="analytics-total"]').should('contain', '150')
    cy.get('[data-cy="analytics-pending"]').should('contain', '12')
    cy.get('[data-cy="analytics-approved"]').should('contain', '120')
    cy.get('[data-cy="analytics-rejected"]').should('contain', '18')
    cy.get('[data-cy="analytics-avg-time"]').should('contain', '2.5 hours')
  })
})