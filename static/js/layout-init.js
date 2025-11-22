// Unified layout initializer: sidebar state, theme, tooltips
(function(){
  const html = document.documentElement;
  const body = document.body;
  const sidebar = document.querySelector('.app-sidebar');
  const collapseBtn = document.getElementById('layoutCollapseBtn');
  const mobileToggle = document.getElementById('layoutMobileToggle');

  // Theme load
  const savedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', savedTheme);

  const themeToggle = document.getElementById('themeToggleGlobal');
  const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;

  function reflectTheme(mode){
    if(themeIcon){
      themeIcon.classList.toggle('bi-moon', mode === 'light');
      themeIcon.classList.toggle('bi-sun', mode === 'dark');
    }
    if(themeToggle){
      const label = mode === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro';
      themeToggle.setAttribute('title', label);
      themeToggle.setAttribute('aria-label', label);
    }
  }

  function setTheme(next){
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    reflectTheme(next);
  }

  reflectTheme(savedTheme);

  if(themeToggle){
    themeToggle.addEventListener('click',()=>{
      const current = html.getAttribute('data-theme');
      setTheme(current === 'light' ? 'dark':'light');
    });
  }

  // Sidebar collapse
  function setCollapsed(flag){
    if(flag){ document.body.classList.add('sidebar-collapsed'); localStorage.setItem('sidebarCollapsed','1'); }
    else { document.body.classList.remove('sidebar-collapsed'); localStorage.removeItem('sidebarCollapsed'); }
  }
  if(localStorage.getItem('sidebarCollapsed')==='1'){ setCollapsed(true); }
  if(collapseBtn){ collapseBtn.addEventListener('click',()=> setCollapsed(!document.body.classList.contains('sidebar-collapsed'))); }

  // Mobile open
  if(mobileToggle && sidebar){
    mobileToggle.addEventListener('click',()=> sidebar.classList.toggle('open'));
    document.addEventListener('click',(event)=>{
      if(window.innerWidth > 991){ return; }
      if(!sidebar.contains(event.target) && !mobileToggle.contains(event.target)){
        sidebar.classList.remove('open');
      }
    });
  }

  function syncWideScreen(){
    body.classList.toggle('wide-screen', window.innerWidth >= 1800);
  }
  syncWideScreen();
  let resizeRaf;
  window.addEventListener('resize',()=>{
    if(resizeRaf){ cancelAnimationFrame(resizeRaf); }
    resizeRaf = requestAnimationFrame(syncWideScreen);
  });

  // Tooltips (Bootstrap) fallback
  if(window.bootstrap){
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => { try { new bootstrap.Tooltip(el); } catch(e){} });
  }

})();
