\
(async function(){
  const preguntas = await fetch('preguntas.json').then(r=>r.json());
  const app = document.getElementById('main');

  function qs(sel, ctx=document){ return ctx.querySelector(sel); }
  function create(tag, attrs={}, children=[]){
    const el = document.createElement(tag);
    for(const k in attrs){ if(k==='html'){ el.innerHTML=attrs[k]; } else el.setAttribute(k, attrs[k]); }
    (Array.isArray(children)?children:[children]).forEach(c=>{ if(!c) return; if(typeof c==='string') el.appendChild(document.createTextNode(c)); else el.appendChild(c); });
    return el;
  }

  function nowISO(){ return new Date().toISOString(); }
  function formatShortDate(iso){ return new Date(iso).toLocaleString(); }

  function loadAttempts(){ try{ return JSON.parse(localStorage.getItem('practica_intentos')||'[]'); }catch(e){ return []; } }
  function saveAttempt(a){ const arr = loadAttempts(); arr.push(a); localStorage.setItem('practica_intentos', JSON.stringify(arr,null,2)); }

  // Pantalla de login/rol
  function screenLogin(){
    app.innerHTML='';
    const container = create('div');
    const userLabel = create('div',{},[create('label',{},'Usuario (p.ej. juan.perez)'), create('br'), create('input',{type:'text', id:'username'})]);
    const buttons = create('div',{},[create('button',{id:'alumnoBtn'},'Entrar como alumno'), create('button',{id:'profesorBtn'},'Entrar como profesor')]);
    const note = create('div',{class:'note'},'Introduce un nombre de usuario; en la demo los intentos se guardan en el navegador (localStorage).');
    container.appendChild(userLabel);
    container.appendChild(buttons);
    container.appendChild(note);
    app.appendChild(container);

    document.getElementById('alumnoBtn').onclick = ()=>{
      const username = document.getElementById('username').value.trim();
      if(!username){ alert('Escribe un nombre de usuario antes'); return; }
      screenAlumno(username);
    };
    document.getElementById('profesorBtn').onclick = ()=>{
      const username = document.getElementById('username').value.trim();
      if(!username){ alert('Escribe un nombre de usuario antes'); return; }
      screenProfesor(username);
    };
  }

  // Alumno
  function screenAlumno(username){
    let step = -1;
    let answers = preguntas.map(()=>({text:'', result:null}));
    let startTime = null;
    let inputEl = null;
    let feedbackEl = null;

    function render(){
      app.innerHTML='';
      if(step === -1){
        const el = create('div');
        el.appendChild(create('h2',{},'Instrucciones antes del ejercicio'));
        const ul = create('ul');
        ul.appendChild(create('li',{},'Hay que contestar con exactitud a lo que se pide.'));
        ul.appendChild(create('li',{},'Todas las letras deben estar escritas en minúsculas.'));
        ul.appendChild(create('li',{},'Hay que poner tildes cuando la palabra lo requiera.'));
        el.appendChild(ul);
        const startBtn = create('button',{id:'start'},'Comenzar ejercicio');
        startBtn.onclick = ()=>{ step=0; startTime = Date.now(); render(); };
        el.appendChild(startBtn);
        app.appendChild(el);
        return;
      }

      if(step >=0 && step < preguntas.length){
        const q = preguntas[step];
        const grid = create('div',{class:'grid'});
        const left = create('div');
        if(q.imagen){
          const imgPath = q.imagen.replace(/^public\//,''); // adjust possible path
          left.appendChild(create('img',{src: imgPath, alt:'imagen pregunta'}));
        } else {
          left.appendChild(create('div',{class:'small'},'Imagen no disponible'));
        }
        const right = create('div');
        right.appendChild(create('div',{},['<strong>Enunciado:</strong> ', q.pregunta]));
        right.appendChild(create('div',{},[create('label',{},'Tu respuesta (minúsculas, tildes)'), create('br')]));
        inputEl = create('input',{type:'text', id:'answerInput'});
        right.appendChild(inputEl);
        const responder = create('button',{id:'res'} ,'Responder');
        const borrar = create('button',{id:'borr'},'Borrar');
        right.appendChild(responder); right.appendChild(borrar);

        feedbackEl = create('div', {id:'feedback'});
        right.appendChild(feedbackEl);

        responder.onclick = ()=>{
          const raw = inputEl.value.trim();
          if(!raw){ alert('Introduce una respuesta'); return; }
          if(raw !== raw.toLowerCase()){
            feedbackEl.innerHTML = ''; feedbackEl.className='bad'; feedbackEl.textContent = 'Escribe la respuesta en minúsculas exactamente (regla del ejercicio).'; return;
          }
          const isCorrect = raw === q.respuesta_correcta;
          answers[step] = { text: raw, result: isCorrect };
          if(isCorrect){ feedbackEl.innerHTML=''; feedbackEl.className='ok'; feedbackEl.textContent='Correcto ✅'; }
          else { feedbackEl.innerHTML=''; feedbackEl.className='bad'; feedbackEl.textContent = 'Incorrecto ❌. La respuesta correcta es: ' + (q.respuesta_correcta || '---'); }
          // mostrar siguiente boton
          const next = create('button',{id:'next'},'Siguiente');
          next.onclick = ()=>{ step++; render(); };
          right.appendChild(create('div',{}, next));
        };
        borrar.onclick = ()=>{ inputEl.value=''; feedbackEl.innerHTML=''; feedbackEl.className=''; };

        grid.appendChild(left); grid.appendChild(right);
        app.appendChild(grid);
        return;
      }

      // resumen
      if(step >= preguntas.length){
        const end = Date.now();
        const durationSec = Math.round((end - startTime)/1000);
        const totalRespondidas = answers.filter(a=>a.text && a.text.length>0).length;
        const correctas = answers.filter(a=>a.result).length;
        const byCat = {};
        preguntas.forEach((q, idx)=>{
          const cat = q.categoria || 'sin categoría';
          if(!byCat[cat]) byCat[cat] = {tot:0, ok:0};
          if(answers[idx] && answers[idx].text){ byCat[cat].tot += 1; if(answers[idx].result) byCat[cat].ok += 1; }
        });
        const attempt = {
          username, date: nowISO(), durationSec, totalRespondidas, correctas, percent: totalRespondidas?Math.round((correctas/totalRespondidas)*100):0, byCategory: byCat, detail: answers.map((a,idx)=>({questionId:preguntas[idx].id, pregunta:preguntas[idx].pregunta, respuesta_usuario:a.text, correcta:a.result}))
        };
        saveAttempt(attempt);

        const el = create('div');
        el.appendChild(create('h2',{},'Resumen del intento'));
        el.appendChild(create('div',{},'Fecha: ' + formatShortDate(attempt.date)));
        el.appendChild(create('div',{},'Preguntas respondidas: ' + attempt.totalRespondidas));
        el.appendChild(create('div',{},'Correctas: ' + attempt.correctas + ' (' + attempt.percent + '%)'));
        el.appendChild(create('div',{},'Duración: ' + attempt.durationSec + ' segundos'));
        el.appendChild(create('h3',{},'Por categoría'));
        const table = create('table');
        const thead = create('thead'); thead.innerHTML = '<tr><th>Categoría</th><th>Respondidas</th><th>Aciertos</th><th>% Aciertos</th></tr>';
        table.appendChild(thead);
        const tbody = create('tbody');
        for(const cat in attempt.byCategory){
          const row = create('tr');
          row.innerHTML = '<td>' + cat + '</td><td>' + attempt.byCategory[cat].tot + '</td><td>' + attempt.byCategory[cat].ok + '</td><td>' + (attempt.byCategory[cat].tot? Math.round((attempt.byCategory[cat].ok/attempt.byCategory[cat].tot)*100):0) + '%</td>';
          tbody.appendChild(row);
        }
        table.appendChild(tbody);
        el.appendChild(table);
        const volver = create('button',{},'Volver a instrucciones');
        volver.onclick = ()=>{ step=-1; answers = preguntas.map(()=>({text:'', result:null})); render(); };
        const salir = create('button',{},'Salir');
        salir.onclick = ()=>{ screenLogin(); };
        el.appendChild(volver); el.appendChild(salir);
        app.appendChild(el);
        return;
      }
    }

    render();
  }

  // Profesor
  function screenProfesor(username){
    app.innerHTML='';
    const attempts = loadAttempts();
    const el = create('div');
    el.appendChild(create('h2',{},'Vista profesor'));
    el.appendChild(create('div',{}, 'Profesor: ' + username));
    const updateBtn = create('button',{},'Actualizar');
    updateBtn.onclick = ()=> screenProfesor(username);
    const clearBtn = create('button',{},'Borrar todos');
    clearBtn.onclick = ()=>{ if(confirm('Eliminar todos los intentos?')){ localStorage.removeItem('practica_intentos'); screenProfesor(username); } };
    el.appendChild(updateBtn); el.appendChild(clearBtn);
    el.appendChild(create('div',{},''));
    const table = create('table');
    const thead = create('thead'); thead.innerHTML = '<tr><th>Alumno</th><th>Fecha</th><th>Duración (s)</th><th>Respondidas</th><th>Correctas</th><th>%</th><th>Detalle</th></tr>';
    table.appendChild(thead);
    const tbody = create('tbody');
    attempts.forEach((a,i)=>{
      const tr = create('tr');
      const detailTd = create('td');
      detailTd.innerHTML = '<details><summary>Ver</summary></details>';
      const det = detailTd.querySelector('details');
      const info = create('div');
      const ul = create('ul');
      for(const cat in a.byCategory){ ul.appendChild(create('li',{}, cat + ': ' + a.byCategory[cat].ok + '/' + a.byCategory[cat].tot)); }
      info.appendChild(create('strong',{},'Por categoría:')); info.appendChild(ul);
      const ol = create('ol');
      a.detail.forEach(d=>{ ol.appendChild(create('li',{}, d.pregunta + ' — respuesta alumno: "' + (d.respuesta_usuario || '') + '" — correcta: ' + (d.correcta? 'sí':'no') )); });
      info.appendChild(create('strong',{},'Detalle preguntas:')); info.appendChild(ol);
      det.appendChild(info);
      tr.innerHTML = '<td>' + a.username + '</td><td>' + formatShortDate(a.date) + '</td><td>' + a.durationSec + '</td><td>' + a.totalRespondidas + '</td><td>' + a.correctas + '</td><td>' + a.percent + '%</td>';
      tr.appendChild(detailTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    el.appendChild(table);
    const back = create('div',{}, create('button',{},'Volver') );
    back.querySelector('button').onclick = ()=> screenLogin();
    el.appendChild(back);
    app.appendChild(el);
  }

  // Inicio
  screenLogin();

})();
