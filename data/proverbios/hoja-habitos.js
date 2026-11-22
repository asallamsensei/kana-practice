
document.getElementById('print-free-habit').addEventListener('click', async function () {
  const habito = prompt(
    '¿Qué hábito quieres practicar?\nDéjalo vacío para escribirlo a mano.'
  );
  if (habito === null) return;
 
  const hoy = new Date();
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const respuesta = prompt('Mes del calendario (AAAA-MM):', actual);
  if (respuesta === null) return;

  const mes = respuesta.trim();
  if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(mes)) {
    alert('Escribe un mes válido, por ejemplo: 2026-10.');
    return;
  }

  this.disabled = true;

  try {
    const { PDFDocument, StandardFonts, rgb } = await window.BookPdf.loadEditor();
    const pdf = await PDFDocument.create();
    const pagina = pdf.addPage([612, 792]);
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);

    const texto = (contenido, x, y, size = 14) =>
      pagina.drawText(contenido, { x, y, size, font: fuente });

    texto('Asallam Sensei', 54, 742, 12);
    pagina.drawText('Mi hoja de hábitos', {
      x: 54, y: 700, size: 26, font: fuente,
      color: rgb(0.66, 0.08, 0.13)
    });
    
    texto('Hábito:', 54, 650, 18);
    
    const nombreHabito = habito.trim();
    
    if (nombreHabito) {
      // Ajusta el tamaño para que el hábito quepa en la línea.
      const tamano = Math.min(
        16,
        440 / fuente.widthOfTextAtSize(nombreHabito, 1)
      );
    
      texto(nombreHabito, 118, 650, tamano);
    } else {
      pagina.drawLine({
        start: { x: 118, y: 647 },
        end: { x: 558, y: 647 },
        thickness: 1
      });
    }

    const [anio, numeroMes] = mes.split('-').map(Number);
    const fecha = new Date(anio, numeroMes - 1, 1);
    const nombreMes = fecha.toLocaleDateString('es', {
      month: 'long', year: 'numeric'
    });

    texto('Mes: ' + nombreMes, 54, 610, 17);

    const inicio = (fecha.getDay() + 6) % 7;
    const total = new Date(anio, numeroMes, 0).getDate();

    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((dia, i) => {
      texto(dia, 54 + i * 72 + 23, 575, 12);
    });

    const filas = Math.ceil((inicio + total) / 7);
      for (let i = 0; i < filas * 7; i++) {
       
      const x = 54 + (i % 7) * 72;
      const y = 558 - Math.floor(i / 7) * 60;

      pagina.drawRectangle({
        x, y: y - 60, width: 72, height: 60,
        borderWidth: 0.6, borderColor: rgb(0.6, 0.6, 0.6)
      });

      const dia = i - inicio + 1;
      if (dia > 0 && dia <= total) texto(String(dia), x + 8, y - 18, 12);
    }

    texto('Marca cada día que practiques tu hábito.', 54, 165, 12);

    const blob = new Blob([await pdf.save()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `Hoja_de_habitos_${mes}.pdf`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error(error);
    alert('No se pudo generar el PDF. Inténtalo de nuevo.');
  } finally {
    this.disabled = false;
  }
});
