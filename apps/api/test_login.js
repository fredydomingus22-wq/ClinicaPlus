async function testLogin() {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contacto.naturamed@gmail.com',
        password: 'Demo1234!',
        clinicaSlug: 'nutrimacho-ao'
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      console.log('Login Success:', data);
    } else {
      console.error('Login Failed:', res.status, data);
    }
  } catch (error) {
    console.error('Network Error:', error.message);
  }
}

testLogin();
