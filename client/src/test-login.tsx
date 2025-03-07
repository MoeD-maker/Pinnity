import { useEffect, useState } from 'react';

export default function TestLogin() {
  const [result, setResult] = useState<string>('Testing...');

  useEffect(() => {
    const testLogin = async () => {
      try {
        setResult('Attempting to login...');
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'customer@test.com',
            password: 'Customer123!'
          })
        });
        
        setResult(prev => prev + `\nStatus: ${response.status}`);
        
        const responseText = await response.text();
        setResult(prev => prev + `\nResponse: ${responseText}`);
        
        try {
          const data = JSON.parse(responseText);
          setResult(prev => prev + `\nParsed data: ${JSON.stringify(data)}`);
        } catch (e) {
          setResult(prev => prev + `\nFailed to parse as JSON: ${e}`);
        }
      } catch (error) {
        setResult(prev => prev + `\nError: ${error}`);
      }
    };
    
    testLogin();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Login Test</h1>
      <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{result}</pre>
    </div>
  );
}