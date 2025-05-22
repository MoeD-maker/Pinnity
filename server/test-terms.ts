/**
 * Debug endpoint for Terms of Service validation issues
 */
import { Express, Request, Response } from "express";
// Import express types only
// No need to import csrfProtection as we're bypassing it for testing

export function addTestRoutes(app: Express) {
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
    const isStringOneTrue = req.body.termsAccepted === '1';
    const isAccepted = isExactlyTrue || isStringTrue || isStringOneTrue;
    
    console.log("IS EXACTLY TRUE:", isExactlyTrue);
    console.log("IS STRING TRUE:", isStringTrue);
    console.log("IS STRING ONE TRUE:", isStringOneTrue);
    console.log("IS ACCEPTED (EITHER):", isAccepted);
    
    return res.json({
      received: req.body.termsAccepted,
      receivedType: typeof req.body.termsAccepted,
      isExactlyTrue,
      isStringTrue,
      isStringOneTrue,
      isAccepted,
      summary: `Terms were ${isAccepted ? 'ACCEPTED' : 'REJECTED'}`
    });
  });

  // Create a simple test form to debug the termsAccepted field
  app.get("/test-terms-form", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Terms Form</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          button { padding: 8px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
          pre { background: #f5f5f5; padding: 15px; overflow: auto; }
          .result { margin-top: 20px; border: 1px solid #ddd; padding: 15px; }
        </style>
      </head>
      <body>
        <h1>Test Terms Form</h1>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="terms"> I accept the terms and conditions
          </label>
        </div>
        
        <div class="form-group">
          <label>Test as:</label>
          <select id="valueType">
            <option value="boolean">Boolean (true/false)</option>
            <option value="string">String ('true'/'false')</option>
            <option value="number">Number (1/0)</option>
          </select>
        </div>
        
        <button onclick="submitForm()">Submit</button>
        
        <div class="result">
          <h3>Result:</h3>
          <pre id="result">Submit the form to see results</pre>
        </div>
        
        <script>
          async function submitForm() {
            const termsChecked = document.getElementById('terms').checked;
            const valueType = document.getElementById('valueType').value;
            
            let termsValue;
            
            // Convert value based on selected type
            if (valueType === 'boolean') {
              termsValue = termsChecked;
            } else if (valueType === 'string') {
              termsValue = termsChecked ? 'true' : 'false';
            } else if (valueType === 'number') {
              termsValue = termsChecked ? 1 : 0;
            }
            
            try {
              const response = await fetch('/api/test/terms', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  termsAccepted: termsValue
                })
              });
              
              const result = await response.json();
              document.getElementById('result').textContent = JSON.stringify(result, null, 2);
            } catch (error) {
              document.getElementById('result').textContent = 'Error: ' + error.message;
            }
          }
        </script>
      </body>
      </html>
    `);
  });
}