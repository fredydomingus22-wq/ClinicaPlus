const axios = require('axios');
const http = require('http');

async function test() {
  const server = http.createServer((req, res) => {
    console.log('URL RECEIVED:', req.url);
    res.end();
  });

  server.listen(4567, async () => {
    try {
      await axios.get('http://localhost:4567/test', {
        params: {
          especialidadeId: null,
          ativo: true,
          page: 1
        }
      });
    } catch (e) {}
    server.close();
  });
}

test();
