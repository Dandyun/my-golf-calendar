/* My Golf Calendar: route ONLY calendar "Create a new plan" buttons
   to Search Course, without editing app.js or the Course Preview layout. */
(() => {
  'use strict';
  document.addEventListener('click', (event) => {
    const element = event.target;
    if (!(element instanceof Element)) return;
    const button = element.closest('button[data-act="map"]');
    if (!button || !document.getElementById('app')?.contains(button)) return;
    // Map icon buttons still navigate to the map as before.
    if (/\bcreate (?:a new|another) plan\b/i.test(button.textContent || '')) {
      button.dataset.act = 'searchPage';
    }
  }, true); // capture runs before app.js handles click on #app
})();
