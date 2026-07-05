# Arista VeloCloud — SE Workshop (SD-WAN Topology Builder)
## Release Notes

A single-page, zero-dependency web app for drawing SD-WAN topologies. Everything runs in the browser (one `index.html`), auto-saves locally, and deploys to GitHub Pages.

**Live:** https://ameyaarista.github.io/arista_sdwan_topology_builder/
**Repo:** https://github.com/ameyaarista/arista_sdwan_topology_builder

---

## v1.1 — latest

### Multi-page workspaces
- **Tabs** — draw independent topologies on multiple pages. Each page keeps its own diagram **and its own undo/redo history**. Add (+), switch, double-click to rename inline, and delete tabs. Auto-save now persists all pages (older single-diagram saves migrate to "Page 1" automatically).

### New device types
- **5G** (orange signal disc) and **Satellite** (dish) added to Network Devices.

### Editing & productivity
- **Duplicate** selection with **Ctrl/Cmd+D**, and **copy/paste** with **Ctrl/Cmd+C / V** — clones full config (cloud, color, scale, size, labels) plus the links *among* the copied nodes, and reattaches copied subnets to their copied device. Paste centers on your current view; works across pages.
- **Free-hand lines** — the solid/dotted connector tools now double as free lines: click two nodes to connect them, or **press-drag on empty canvas** to draw a line anywhere. Free lines have draggable endpoints and support color, labels, and delete.
- **Text font size** — a font-size selector (10–64) appears when a text box is selected.
- **Everything edits inline** — devices, gateways, subnets (CIDR), text, groups, and connections all rename via an inline field (double-click or ✎). No more pop-ups.
- **Double-click** to edit works on devices, gateways, text, and connections (custom detection, since the canvas re-renders on every click).

### Styling
- **Recolor gateways** (VCG) — green/blue/gray swatches, matching devices and subnets.

### Layout quality
- **Adaptive tier spacing** — auto-layout keeps tiers tight by default and only widens the gap around tiers that have attached subnets, so nothing overlaps and there's no wasted space (e.g., between VCO and gateways).
- **Collision-free placement** — newly added nodes nudge off any existing node so a drop never lands on top of another.
- **Clouds tier** — Internet/MPLS now sit on their own tier between spokes and hubs.

### Workspace shortcuts (right panel)
- **Velo Bug Search** → `bb.infra.corp.arista.io/bug/<id>`
- **Velo TAC Case** → `case-reader.aristanetworks.com/case/<id>`
- **Velo OPS Case** → `velocloud.atlassian.net/browse/VELOPS-<id>`
- **GDrive Search** → Google Drive search for a query
- **Velo Power BI** → opens the team Power BI report

### Renamed
- App title is now **Arista Velocloud - SE Workshop**; the header **Reset** button (was "Reset to sample").

> Note: an Align & Distribute panel was trialed in this cycle and removed; the drag **alignment guides** remain.

---

## v1.0 — initial release

### Highlights

- 20+ SD-WAN, network, cloud, and SASE/SSE device types with real product icons
- Smart connections that auto-style themselves (SD-WAN, IPsec, Interconnect, plain)
- Layered ("tiered") auto-layout plus one-click Auto-arrange
- 7 starter templates
- Full editing: drag, resize, recolor, inline-rename
- Group/region containers, text annotations, freehand pen
- PNG / SVG export, browser auto-save, undo/redo
- Live topology validation and a curated Arista/VeloCloud resource library

---

## Device library

Organized into categories in the **Add Device** palette:

- **SD-WAN Devices** — Spoke, Hub, Cluster, AWS Hub, Azure Hub, GCP Hub, Virtual WAN
- **Network Devices** — Router, Switch, Firewall, 5G, Satellite
- **Management** — VCO (Orchestrator), VCG (Gateway)
- **Clouds** — Internet, MPLS
- **SASE / SSE** — Zscaler, Palo Alto Prisma, Netskope

Each device drops onto the canvas where you're looking, with an auto-generated name.

## Connections

- Draw connections from a device's **Suggested connections** panel, which only offers valid targets.
- **Automatic link styling by endpoint type:**
  - **Interconnect** (purple) — core ↔ core (hub/cluster)
  - **IPsec** (orange dashed) — gateway ↔ SSE/firewall, firewall ↔ spoke/hub/cluster/gateway, and spoke/hub/cluster ↔ SSE
  - **Plain, unlabeled** — SSE ↔ Internet, and any link touching a router/switch
  - **SD-WAN** — default overlay for everything else
- **Connection rules** — Virtual WAN connects only to an Azure Hub; Internet/MPLS/router/switch/5G/satellite connect to anything; gateways connect to any node.
- Transport tags rotate to run **along** the connection line and stay upright.
- **Manual connectors** — solid and dotted line tools (bottom toolbar) to link any two nodes.
- **Per-connection color** and **custom labels** (edit inline by double-clicking a line).
- Select a connection to delete it, recolor it, or relabel it.

## Templates

Seven ready-made topologies in the **Templates** menu:

- Hub & Spoke
- Full Mesh (2×2 layout)
- Multi-Region (default landing view)
- 5-Site (2 hubs, 3 spokes)
- 3-Site (1 hub, 2 spokes)
- NSDvEdge
- NSDvGateway

## Layout & arrangement

- **Tiered auto-layout** stacks nodes into meaningful layers (bottom → top): routers/switches, spokes/firewalls, clouds (Internet/MPLS), hubs/clusters, VWAN, SSE, VCO — with barycenter ordering so linked nodes line up vertically. Empty tiers are compacted so nothing floats.
- **Auto-arrange** button re-runs the layout and fits to screen.
- **Align & distribute** — select multiple nodes to align left/center/right, top/middle/bottom, or distribute evenly.
- **Snap-to-grid** toggle and **live alignment guides** while dragging.
- Multiple subnets on a device lay out in a neat side-by-side row.
- **Fit / 1:1 / zoom** controls; pan by scrollbars, two-finger scroll, or Space/middle-mouse drag.

## Editing & productivity

- **Group-select** (rubber-band marquee + Shift-click) and move groups together.
- **Move, resize** (corner handle), and **recolor** nodes (SD-WAN devices, subnets and their connectors, groups — green/blue/gray).
- **Inline editing everywhere** — double-click or the ✎ badge to rename devices, gateways, subnets (CIDR), text, groups, and connections. No popups.
- **Delete** via the × badge or Delete/Backspace.
- **Undo / redo** (buttons + Ctrl/Cmd+Z), and **auto-save** to the browser so a refresh keeps your work.

## Annotation

- **Group / region containers** — labeled boxes drawn behind nodes; grab by header/border, resize, recolor, rename.
- **Text boxes** — click to place, type inline.
- **Freehand pen** in multiple colors with a clear-drawing option.

## Validation

Live **Topology checks** panel flags:
- Orphan nodes (no connections)
- Duplicate device names
- Duplicate / overlapping CIDRs (subnets and clouds)

## Export & persistence

- **Export as PNG or SVG** — one-click image of the diagram, tightly cropped with a white background.
- **Auto-save** to browser localStorage; **Reset** and **Clear canvas** to start over.

## Resources

- **VeloCloud resources** dropdown with the Arista Knowledge Base, VCO orchestrator logins, the SD-WAN data sheet, and the full set of admin/design/deployment/API guides and release notes.

## Deployment

- GitHub Actions workflow publishes the app to GitHub Pages on every push to `main`.

---

## Notable fixes

- Fixed a malformed-SVG bug (unclosed `<g>` from the subnet connector) that could hide device icons on templates with subnets.
- Fixed runaway/asymmetric dragging by using stable screen-space deltas and a non-shifting "world" viewBox with scroll compensation.
- Fixed horizontal scrolling and made the canvas scrollbar reliably visible.
- Mutually-exclusive header dropdowns (only one opens at a time).
