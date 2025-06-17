describe('Vendor Deal Creation Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.loginAs('business')
  })

  it('should successfully create a new deal as vendor', () => {
    // Navigate to deal creation page
    cy.visit('/vendor/deals/new')
    cy.waitForPageLoad()
    
    // Fill deal information
    cy.get('[data-cy="deal-title-input"]').type('20% Off Coffee Drinks')
    cy.get('[data-cy="deal-description-input"]').type('Get 20% off all coffee drinks during happy hour')
    
    // Select category
    cy.get('[data-cy="category-select"]').click()
    cy.get('[data-cy="category-option-food"]').click()
    
    // Set discount details
    cy.get('[data-cy="discount-percentage-input"]').type('20')
    cy.get('[data-cy="original-price-input"]').type('5.00')
    cy.get('[data-cy="discounted-price-input"]').type('4.00')
    
    // Set availability
    cy.get('[data-cy="quantity-input"]').type('100')
    cy.get('[data-cy="start-date-input"]').type('2025-01-01')
    cy.get('[data-cy="end-date-input"]').type('2025-12-31')
    
    // Upload deal image
    cy.fixture('deal-image.jpg', 'base64').then(fileContent => {
      cy.get('[data-cy="deal-image-upload"]').selectFile({
        contents: Cypress.Buffer.from(fileContent, 'base64'),
        fileName: 'deal-image.jpg',
        mimeType: 'image/jpeg',
      }, { force: true })
    })
    
    // Wait for image upload
    cy.get('[data-cy="image-preview"]').should('be.visible')
    
    // Set terms and conditions
    cy.get('[data-cy="terms-input"]').type('Valid during business hours only. Cannot be combined with other offers.')
    
    // Mock deal creation API
    cy.intercept('POST', '/api/v1/vendor/deals', {
      statusCode: 201,
      body: { 
        success: true, 
        deal: { 
          id: 1, 
          title: '20% Off Coffee Drinks',
          status: 'pending'
        }
      }
    }).as('createDeal')
    
    // Submit the deal
    cy.get('[data-cy="create-deal-submit"]').click()
    cy.wait('@createDeal')
    
    // Should redirect to deals list with pending status
    cy.url().should('include', '/vendor/deals')
    cy.get('[data-cy="deal-status-pending"]').should('be.visible')
    cy.get('[data-cy="deal-status-pending"]').should('contain', 'Pending')
    cy.get('[data-cy="success-message"]').should('contain', 'submitted for review')
  })

  it('should validate required fields', () => {
    cy.visit('/vendor/deals/new')
    
    // Try to submit empty form
    cy.get('[data-cy="create-deal-submit"]').click()
    
    // Should show validation errors
    cy.get('[data-cy="error-title"]').should('contain', 'required')
    cy.get('[data-cy="error-description"]').should('contain', 'required')
    cy.get('[data-cy="error-category"]').should('contain', 'required')
  })

  it('should validate price fields correctly', () => {
    cy.visit('/vendor/deals/new')
    
    // Fill basic info
    cy.get('[data-cy="deal-title-input"]').type('Test Deal')
    cy.get('[data-cy="deal-description-input"]').type('Test Description')
    cy.get('[data-cy="category-select"]').click()
    cy.get('[data-cy="category-option-food"]').click()
    
    // Enter invalid prices (discounted > original)
    cy.get('[data-cy="original-price-input"]').type('5.00')
    cy.get('[data-cy="discounted-price-input"]').type('10.00')
    
    cy.get('[data-cy="create-deal-submit"]').click()
    
    cy.get('[data-cy="error-price"]').should('contain', 'discounted price must be less than original price')
  })

  it('should validate date ranges', () => {
    cy.visit('/vendor/deals/new')
    
    // Fill basic info
    cy.get('[data-cy="deal-title-input"]').type('Test Deal')
    cy.get('[data-cy="deal-description-input"]').type('Test Description')
    cy.get('[data-cy="category-select"]').click()
    cy.get('[data-cy="category-option-food"]').click()
    
    // Set end date before start date
    cy.get('[data-cy="start-date-input"]').type('2025-12-31')
    cy.get('[data-cy="end-date-input"]').type('2025-01-01')
    
    cy.get('[data-cy="create-deal-submit"]').click()
    
    cy.get('[data-cy="error-date"]').should('contain', 'end date must be after start date')
  })

  it('should handle image upload errors', () => {
    cy.visit('/vendor/deals/new')
    
    // Mock image upload failure
    cy.intercept('POST', '/api/v1/upload', {
      statusCode: 500,
      body: { success: false, message: 'Upload failed' }
    }).as('uploadFail')
    
    // Try to upload invalid file
    cy.get('[data-cy="deal-image-upload"]').selectFile({
      contents: 'invalid file content',
      fileName: 'invalid.txt',
      mimeType: 'text/plain',
    }, { force: true })
    
    cy.get('[data-cy="error-upload"]').should('contain', 'supported file types')
  })

  it('should save draft and continue later', () => {
    cy.visit('/vendor/deals/new')
    
    // Fill partial form
    cy.get('[data-cy="deal-title-input"]').type('Draft Deal')
    cy.get('[data-cy="deal-description-input"]').type('This is a draft')
    
    // Mock draft save
    cy.intercept('POST', '/api/v1/vendor/deals/draft', {
      statusCode: 200,
      body: { success: true, draftId: 1 }
    }).as('saveDraft')
    
    // Save as draft
    cy.get('[data-cy="save-draft-button"]').click()
    cy.wait('@saveDraft')
    
    cy.get('[data-cy="draft-saved-message"]').should('contain', 'Draft saved')
    
    // Navigate away and back
    cy.visit('/vendor/deals')
    cy.visit('/vendor/deals/new')
    
    // Should load draft
    cy.get('[data-cy="load-draft-prompt"]').should('be.visible')
    cy.get('[data-cy="load-draft-yes"]').click()
    
    cy.get('[data-cy="deal-title-input"]').should('have.value', 'Draft Deal')
    cy.get('[data-cy="deal-description-input"]').should('have.value', 'This is a draft')
  })

  it('should preview deal before submission', () => {
    cy.visit('/vendor/deals/new')
    
    // Fill complete form
    cy.get('[data-cy="deal-title-input"]').type('Coffee Special')
    cy.get('[data-cy="deal-description-input"]').type('Great coffee deal')
    cy.get('[data-cy="category-select"]').click()
    cy.get('[data-cy="category-option-food"]').click()
    cy.get('[data-cy="original-price-input"]').type('5.00')
    cy.get('[data-cy="discounted-price-input"]').type('4.00')
    
    // Click preview
    cy.get('[data-cy="preview-deal-button"]').click()
    
    // Should show preview modal
    cy.get('[data-cy="deal-preview-modal"]').should('be.visible')
    cy.get('[data-cy="preview-title"]').should('contain', 'Coffee Special')
    cy.get('[data-cy="preview-description"]').should('contain', 'Great coffee deal')
    cy.get('[data-cy="preview-price"]').should('contain', '$4.00')
    cy.get('[data-cy="preview-original-price"]').should('contain', '$5.00')
    
    // Close preview
    cy.get('[data-cy="close-preview"]').click()
    cy.get('[data-cy="deal-preview-modal"]').should('not.exist')
  })
})