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
 *     [data-filter-chips]               optional status-chip group
 *       [data-filter-chip][data-chip-value]   a chip; value is one of
 *                                       all | current | expired | unchained
 *         data-chip-default             the chip active on load
 *     [data-filter-item][data-search]   the rows/cards being filtered
 *       data-status                     valid | expiring | expired | pending
 *       data-orphan                     "true" when the issuer is not mirrored
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

    // Optional status-chip filtering (composes with the text query).
    const chips = Array.from(scope.querySelectorAll('[data-filter-chip]'));
    const defaultChip = chips.find((c) => c.hasAttribute('data-chip-default')) || chips[0];
    let activeStatus = defaultChip ? defaultChip.getAttribute('data-chip-value') : 'all';

    const hideTarget = (item) => (hideSel ? item.closest(hideSel) || item : item);

    const statusMatch = (item) => {
      switch (activeStatus) {
        case 'expired':
          return item.getAttribute('data-status') === 'expired';
        case 'current':
          return item.getAttribute('data-status') !== 'expired';
        case 'unchained':
          return item.getAttribute('data-orphan') === 'true';
        default:
          return true; // 'all'
      }
    };

    function apply(query) {
      const q = query.trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const hay = item.getAttribute('data-search') || '';
        const match = (q === '' || hay.includes(q)) && statusMatch(item);
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
        const filtered = q !== '' || activeStatus !== 'all';
        status.textContent = filtered
          ? template.replace('{0}', String(visible)).replace('{1}', String(total))
          : '';
      }
      if (empty) empty.hidden = visible !== 0;
    }

    if (chips.length) {
      chips.forEach((chip) => {
        chip.setAttribute('aria-pressed', String(chip === defaultChip));
        chip.addEventListener('click', () => {
          activeStatus = chip.getAttribute('data-chip-value');
          chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
          apply(input.value);
        });
      });
    }

    input.addEventListener('input', (event) => apply(event.target.value));

    // Apply once on load so a default chip (e.g. hide expired) takes effect.
    apply(input.value);
  });
}
