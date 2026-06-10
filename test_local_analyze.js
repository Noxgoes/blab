async function testLocalAnalyze() {
  try {
    const res = await fetch('http://localhost:3002/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'So I think like you know when people communicate they need to be um very clear and like direct with what they are trying to say',
        fillerCounts: { 'um': 1, 'like': 2 },
        language: 'English',
        level: 'Intermediate',
        topic: 'Communication'
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testLocalAnalyze();
