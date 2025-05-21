// Simple test file to troubleshoot Terms of Service acceptance
import express from 'express';

export function addTestRoutes(app: express.Express) {
  console.log("Test terms routes have been added!");

  // Test endpoint to see exactly what we receive for termsAccepted values
  app.post("/api/test/terms", (req, res) => {
    console.log("===== TEST TERMS ENDPOINT =====");
    console.log("RECEIVED REQUEST BODY:", JSON.stringify(req.body, null, 2));
    console.log("TERMS ACCEPTED VALUE:", req.body.termsAccepted);
    console.log("TERMS ACCEPTED TYPE:", typeof req.body.termsAccepted);
    console.log("REQUEST HEADERS:", req.headers);
    console.log("===== END TEST TERMS =====");
    
    // Test boolean comparison with true
    const isExactlyTrue = req.body.termsAccepted === true;
    const isStringTrue = req.body.termsAccepted === 'true';
    const isAccepted = isExactlyTrue || isStringTrue;
    
    console.log("IS EXACTLY TRUE:", isExactlyTrue);
    console.log("IS STRING TRUE:", isStringTrue);
    console.log("IS ACCEPTED (EITHER):", isAccepted);
    
    return res.json({
      received: req.body.termsAccepted,
      receivedType: typeof req.body.termsAccepted,
      isExactlyTrue,
      isStringTrue,
      isAccepted,
      summary: `Terms were ${isAccepted ? 'ACCEPTED' : 'REJECTED'}`
    });
  });
}