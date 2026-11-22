
(function () {
  'use strict';
  // Acceso sencillo para un HTML estático; no sustituye autenticación de servidor.
  // Para añadir alumnos, agrega pares [clave, nombre] a esta lista.
  // Para añadir alumnos, agrega [clave, { nombre, genero }].
  // Usa genero: 'femenino' para mostrar "Bienvenida".
  const students = new Map([
    ['calvo', { nombre: 'Freddy' }],
    ['helado', { nombre: 'Gina', genero: 'femenino' }],
    ['maestro', { nombre: 'Esteban' }],
    ['paternidad', { nombre: 'Anderson' }],
    ['mar', { nombre: 'Liz', genero: 'femenino' }]
  ]);
  const form = document.getElementById('student-access-form');
  const password = document.getElementById('student-password');
  const error = document.getElementById('access-error');
  const gate = document.getElementById('student-access');
  // Lectura del código · Enfoque y presentación del formulario.
  function focusPassword() { password.focus({ preventScroll: true }); }
  requestAnimationFrame(focusPassword);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const student = students.get(password.value);
    if (!student) {
      error.textContent = 'La clave no es correcta. Inténtalo de nuevo.';
      password.setAttribute('aria-invalid', 'true');
      focusPassword();
      password.select();
      return;
    }
    error.textContent = '';
    password.removeAttribute('aria-invalid');
    password.value = '';
    gate.hidden = true;
    document.body.classList.remove('access-locked');
    document.body.dataset.student = student.nombre;
    const book = document.getElementById('book');
    book.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    const notice = document.getElementById('toast');
    const saludo = student.genero === 'femenino' ? 'Bienvenida' : 'Bienvenido';
    const mensaje = saludo + ', ' + student.nombre + '.';
    
    notice.textContent = mensaje;
    setTimeout(function () {
      if (notice.textContent === mensaje) notice.textContent = '';
    }, 4500);
  });
})();
