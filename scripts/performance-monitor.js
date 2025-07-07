const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Función para medir el tiempo de carga de páginas
async function measurePageLoad(url) {
  const start = performance.now();
  
  try {
    const response = await fetch(url);
    const end = performance.now();
    const loadTime = end - start;
    
    return {
      url,
      status: response.status,
      loadTime: Math.round(loadTime),
      success: response.ok
    };
  } catch (error) {
    const end = performance.now();
    return {
      url,
      status: 'ERROR',
      loadTime: Math.round(end - start),
      success: false,
      error: error.message
    };
  }
}

// Función para medir el tamaño de los bundles
function analyzeBundleSize() {
  const buildDir = path.join(__dirname, '..', '.next');
  const staticDir = path.join(buildDir, 'static');
  
  if (!fs.existsSync(staticDir)) {
    console.log('❌ No se encontró el directorio de build');
    return;
  }
  
  const chunks = [];
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.js') && !file.includes('polyfills')) {
        const size = stat.size;
        chunks.push({
          name: file,
          size: size,
          sizeKB: Math.round(size / 1024)
        });
      }
    });
  };
  
  walkDir(staticDir);
  
  chunks.sort((a, b) => b.size - a.size);
  
  console.log('\n📦 ANÁLISIS DE BUNDLES:');
  console.log('====================');
  
  let totalSize = 0;
  chunks.slice(0, 10).forEach(chunk => {
    totalSize += chunk.size;
    console.log(`${chunk.name}: ${chunk.sizeKB} KB`);
  });
  
  console.log(`\nTotal de los 10 chunks más grandes: ${Math.round(totalSize / 1024)} KB`);
  
  // Verificar chunks problemáticos
  const largeChunks = chunks.filter(chunk => chunk.sizeKB > 100);
  if (largeChunks.length > 0) {
    console.log('\n⚠️  CHUNKS GRANDES DETECTADOS:');
    largeChunks.forEach(chunk => {
      console.log(`${chunk.name}: ${chunk.sizeKB} KB`);
    });
  }
}

// Función principal de monitoreo
async function runPerformanceTest() {
  console.log('🚀 INICIANDO MONITOREO DE RENDIMIENTO');
  console.log('=====================================\n');
  
  // URLs para probar
  const urls = [
    'http://localhost:3000',
    'http://localhost:3000/feed',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/trades',
    'http://localhost:3000/api/feed?page=1&limit=10'
  ];
  
  console.log('⏱️  TIEMPOS DE CARGA:');
  console.log('====================');
  
  const results = [];
  
  for (const url of urls) {
    const result = await measurePageLoad(url);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const time = result.loadTime;
    const performance = time < 500 ? '🚀' : time < 1000 ? '⚡' : time < 2000 ? '🐌' : '💀';
    
    console.log(`${status} ${performance} ${url.replace('http://localhost:3000', '')}: ${time}ms`);
  }
  
  // Análisis de bundles
  analyzeBundleSize();
  
  // Resumen de rendimiento
  console.log('\n📊 RESUMEN DE RENDIMIENTO:');
  console.log('==========================');
  
  const successfulRequests = results.filter(r => r.success);
  const avgLoadTime = successfulRequests.reduce((sum, r) => sum + r.loadTime, 0) / successfulRequests.length;
  
  console.log(`Requests exitosos: ${successfulRequests.length}/${results.length}`);
  console.log(`Tiempo promedio de carga: ${Math.round(avgLoadTime)}ms`);
  
  const fastPages = successfulRequests.filter(r => r.loadTime < 500).length;
  const slowPages = successfulRequests.filter(r => r.loadTime > 2000).length;
  
  console.log(`Páginas rápidas (<500ms): ${fastPages}`);
  console.log(`Páginas lentas (>2s): ${slowPages}`);
  
  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  console.log('==================');
  
  if (avgLoadTime > 1000) {
    console.log('⚠️  Tiempo de carga promedio alto. Considera:');
    console.log('   - Optimizar imágenes');
    console.log('   - Implementar lazy loading');
    console.log('   - Reducir el tamaño de los bundles');
  }
  
  if (slowPages > 0) {
    console.log('⚠️  Páginas lentas detectadas. Revisa:');
    console.log('   - Consultas a la base de datos');
    console.log('   - Componentes pesados');
    console.log('   - Llamadas a APIs externas');
  }
  
  if (fastPages === successfulRequests.length) {
    console.log('🎉 ¡Excelente! Todas las páginas cargan rápidamente');
  }
  
  // Guardar resultados
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    results,
    summary: {
      avgLoadTime: Math.round(avgLoadTime),
      successRate: (successfulRequests.length / results.length) * 100,
      fastPages,
      slowPages
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Reporte guardado en: scripts/performance-report.json');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest, measurePageLoad, analyzeBundleSize }; 