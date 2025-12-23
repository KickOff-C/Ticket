// src/check-env.ts
console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO\n');

console.log('1. Variables cargadas:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Existe (' + process.env.JWT_SECRET.length + ' chars)' : '❌ No existe');
console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '✅ Existe (' + process.env.JWT_REFRESH_SECRET.length + ' chars)' : '❌ No existe');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Existe' : '❌ No existe');
console.log('PORT:', process.env.PORT || '3000 (default)');

console.log('\n2. Probando generación de token:');
try {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'fallback';
  
  const token = jwt.sign({ id: 1, username: 'test' }, secret, { expiresIn: '1h' });
  console.log('✅ Token generado correctamente');
  console.log('   Longitud:', token.length, 'caracteres');
  console.log('   Primeros 30 chars:', token.substring(0, 30) + '...');
  
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token verificado correctamente');
  console.log('   Payload:', decoded);
  
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

console.log('\n3. Si JWT_SECRET es "undefined" o muy corto, revisa el archivo .env');