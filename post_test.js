const fetch = global.fetch || require('node-fetch');
async function run(){
  const body = { kitchenName: 'TestKitchen', chefName: 'Test Chef', phone: '1234567890', location: 'TestArea', menu: {} };
  try {
    const res = await fetch('http://localhost:5000/chef', { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.text();
    console.log('status', res.status);
    console.log('body', data);
  } catch (err){
    console.error(err);
  }
}
run();
