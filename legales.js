/* Año del pie en las páginas de texto. Archivo aparte, no inline:
   la CSP prohíbe scripts inline sin hash. */
(function () {
  'use strict';
  var el = document.getElementById('anio');
  if (el) el.textContent = String(new Date().getFullYear());
})();
