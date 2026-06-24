import { useEffect } from "react";

interface Props {
  onClose: () => void;
}

export function HelpModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="help-backdrop" onPointerDown={onClose}>
      <div className="help" onPointerDown={(e) => e.stopPropagation()}>
        <div className="help__head">
          <h2>How to use the Account Power Map</h2>
          <button type="button" className="inspector__close" title="Close" onClick={onClose}>×</button>
        </div>

        <div className="help__body">
          <p className="help__lead">
            This isn't an HR org chart — it's a map of the <strong>buying committee</strong>: who
            decides, who backs you, who blocks you, and where you have no coverage.
          </p>

          <h3>The three views</h3>
          <ul>
            <li><strong>Org map</strong> — the reporting tree. Cards are coloured by disposition, badged with buying roles, and show influence as dots.</li>
            <li><strong>Power map</strong> — every person plotted by influence (vertical) × disposition (horizontal). Top-right = mobilise; top-left = convert/neutralise.</li>
            <li><strong>Coverage</strong> — an automatic deal-risk score and a punch-list of gaps to fix.</li>
          </ul>

          <h3>Adding &amp; editing people</h3>
          <ul>
            <li><strong>Add a contact:</strong> top-right <em>＋ Contact</em>, or hover a card and click the <em>＋</em> on its top (manager) or bottom (direct report).</li>
            <li><strong>Edit a contact:</strong> click any card to open the panel on the right. Edit name/title inline on the card too.</li>
            <li><strong>Set disposition, influence, buying roles, Cursor owner, LinkedIn, notes:</strong> all in the right-hand panel — one click each.</li>
            <li><strong>Delete:</strong> the × on a card, the Delete key when selected, or “Delete contact” in the panel.</li>
          </ul>

          <h3>Layout &amp; changing who reports to whom</h3>
          <ul>
            <li>The board <strong>auto-arranges</strong> into a tidy tree: parents stay centred over their reports, spacing stays even, and cards never overlap. Add or remove anyone and everything reflows to make room.</li>
            <li><strong>Drag a card onto another card</strong> (it highlights green) to make the dragged person — and its whole subtree — that card’s <strong>report</strong>. Drop on empty space and it simply snaps back.</li>
            <li>You can also re-parent via the <strong>“Reports to”</strong> picker in the panel (including “Top level”), or add related people with the <strong>＋</strong> buttons on a card (top = manager, bottom = report).</li>
            <li><strong>Fit</strong> (canvas toolbar) zooms to show the whole map.</li>
          </ul>

          <h3>Relationships (the coloured links)</h3>
          <p>
            Links capture influence and politics that the org tree can't: <em>influences</em>,
            <em> dotted-line</em> reporting, <em>allied with</em>, and <em>tension with</em>.
          </p>
          <ul>
            <li><strong>Create a link:</strong> select a contact → in the panel’s <strong>Relationships</strong> section, choose a contact and a link type, then <em>＋ Add link</em>.</li>
            <li><strong>Edit a link:</strong> change its type, strength (1–3) or note right under it in the list.</li>
            <li><strong>Delete a link:</strong> the × next to it.</li>
            <li><strong>Show/hide links on the map:</strong> the <em>Links</em> button in the top bar.</li>
            <li><strong>Filter link types:</strong> in the legend (bottom-left), click a link type to show only it — click several to combine (e.g. Tension + Influences).</li>
          </ul>

          <h3>Finding things</h3>
          <ul>
            <li><strong>Filter by disposition:</strong> click the colours in the legend (bottom-left).</li>
            <li><strong>Power blindspots:</strong> toggle to spotlight high-influence people you have no relationship with.</li>
            <li><strong>Search / jump:</strong> the top filter box, or press <strong>⌘K / Ctrl-K</strong> to jump to a person.</li>
          </ul>

          <h3>Saving, sharing &amp; shortcuts</h3>
          <ul>
            <li>Everything saves automatically in your browser. Use <strong>Export</strong> / <strong>Import</strong> for JSON backups and <strong>Print</strong> for a PDF.</li>
            <li><strong>Undo/redo:</strong> ⌘Z / ⇧⌘Z. <strong>Delete:</strong> removes the selected contact. <strong>Esc:</strong> deselect.</li>
            <li>Manage several accounts with the <em>＋</em> next to the account name.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
