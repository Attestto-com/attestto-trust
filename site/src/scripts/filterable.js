/*
 * Shared client-side list filter. One implementation for every filterable
 * list on the site (home country table, per-country certificate lists).
 *
 * Markup contract (all attributes optional except input + items):
 *   [data-filter-scope]                 wrapper that bounds one filter
 *     [data-filter-input]               the <input>; searches items within scope
 *       data-filter-status-template     "{0} of {1}"-style count template
 *       data-filter-hide-closest=".x"   hide this ancestor of a non-matching
 *                                       item instead of the item itself
 *     [data-filter-item][data-search]   the rows/cards being filtered
 *     [data-filter-group]               a group wrapper hidden when it has no
 *                                       visible items (e.g. a region section)
 *     [data-filter-status]              live-region element for the count
 *     [data-filter-empty]               shown when nothing matches
 */
export function initFilters(root = document) {
  const inputs = root.querySelectorAll('[data-filter-input]');
  inputs.forEach((input) => {
    const scope = input.closest('[data-filter-scope]') || root;
    const items = Array.from(scope.querySelectorAll('[data-filter-item]'));
    const groups = Array.from(scope.querySelectorAll('[data-filter-group]'));
    const status = scope.querySelector('[data-filter-status]');
    const empty = scope.querySelector('[data-filter-empty]');
    const template = input.getAttribute('data-filter-status-template') || '';
    const hideSel = input.getAttribute('data-filter-hide-closest');
    const total = items.length;

    const hideTarget = (item) => (hideSel ? item.closest(hideSel) || item : item);

    function apply(query) {
      const q = query.trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const hay = item.getAttribute('data-search') || '';
        const match = q === '' || hay.includes(q);
        hideTarget(item).style.display = match ? '' : 'none';
        if (match) visible += 1;
      }
      for (const group of groups) {
        const hasVisible = items.some(
          (item) => group.contains(item) && hideTarget(item).style.display !== 'none',
        );
        group.style.display = hasVisible ? '' : 'none';
      }
      if (status) {
        status.textContent = q === ''
          ? ''
          : template.replace('{0}', String(visible)).replace('{1}', String(total));
      }
      if (empty) empty.hidden = visible !== 0;
    }

    input.addEventListener('input', (event) => apply(event.target.value));
  });
}
