# TapLocal Live Google Maps Search & Print Shop Mockup Exporter

Deliver an integrated Live Google Maps Place Auto-Search tool and a tailored Bulk Print Shop Export system organized specifically for multi-mockup physical production (Google Reviews standees, Digital Menu table-tents, WhatsApp placards, Instagram & Facebook social cards).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following critical product decisions have been incorporated based on your production workflow:

- **Mockup-Centric Organization**: Because you place individual QR codes into pre-designed graphic mockups (Google Reviews, Menu, WhatsApp, Facebook, Instagram) before printing, the Bulk Export will organize QR files into categorized folders (`/Google_Reviews/`, `/Digital_Menus/`, `/WhatsApp_Placards/`, `/Instagram_Cards/`, `/Facebook_Stands/`, `/Smart_Hub/`) with transparent high-resolution PNGs (300 DPI equivalent) and scalable vector SVGs.
- **Pre-Print Mockup Assignment**: Each QR link and batch item will have a visible **Target Mockup Template** selector so you can tag which physical graphic template each QR belongs to (e.g., Table 01 -> Google Review Stand, Table 02 -> Menu Card).
- **Print Shop Production Manifest (CSV)**: Generates a standardized print shop spreadsheet listing `Filename`, `Table/Stand Number`, `Target Mockup`, `QR Slug`, `Permanent Short URL`, `Destination Summary`, and `Batch Name` for easy merge into Adobe Illustrator, Photoshop, InDesign, CorelDraw, or laser engraving/vinyl cutters.
- **Live Google Maps Place Auto-Search**: Live autocomplete & business search by name and city/area to automatically fetch Place ID, official direct review submission URL (`https://search.google.com/local/writereview?placeid=...`), business rating, address, and category without manual URL hunting.

---

## 1. Overview & Core Concept

TapLocal connects dynamic physical QR hardware with digital destinations. To bridge the gap between digital setup and physical print production:
1. **Live Google Maps Place Auto-Search**: Business owners or print agents can type a business name and location (e.g., "Grand Royal Cafe, Connaught Place"). The system auto-fills the verified Google Place ID, official direct review submission URL, rating, category, and street address.
2. **Pre-Print Mockup Categorization**: In the dynamic links table and batch view, users can tag or batch-assign each QR code to its designated physical mockup:
   - 🌟 **Google Review Standee** (Acrylic table stand / cash register plate)
   - 🍽️ **Digital Menu Card** (Dining table tent / laminated card)
   - 💬 **WhatsApp Help / Order Desk** (Customer service stand)
   - 📸 **Instagram / Facebook Follow** (Wall sticker / counter tent)
   - 🎛️ **Multi-Action Smart Hub** (All-in-one comprehensive table plate)
3. **Bulk Print Shop Exporter**: Generates a single production-ready ZIP archive containing:
   - Categorized subfolders per mockup type.
   - High-resolution transparent PNGs (1024×1024) and lossless vector SVGs ready for direct drag-and-drop into mockup PSDs/AIs.
   - A laser-cutting & print operator CSV manifest.
   - An on-screen printable A4 Sheet / Grid Proofing view showing mockup labels alongside QR codes for quality checks before running print presses.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Business Setup with Live Google Maps Search                              │
│    Owner types "Spice Court Jaipur" -> Selects verified Google Place        │
│    -> Auto-fills: Place ID, Direct Review URL, Category, Address, Rating   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Pre-Print Mockup Assignment                                              │
│    Owner assigns Target Mockup per QR or entire batch:                      │
│    [x] Google Review Stand  [ ] Digital Menu  [ ] WhatsApp  [ ] Instagram   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Bulk Print Shop Export Modal                                             │
│    - Select Batch or Custom Filter (by Mockup, Location, or Tag)            │
│    - Choose Formats: Transparent High-Res PNG + SVG Vectors + Print CSV     │
│    - Preview Mockup Production Sheet & Download Structured ZIP              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Output ZIP File Structure for Graphic Designers & Print Shops            │
│    ├── manifest_print_shop.csv                                              │
│    ├── 📁 Google_Reviews/                                                   │
│    │    ├── Table-01_[GoogleReviews]_stock-01.png                           │
│    │    └── Table-01_[GoogleReviews]_stock-01.svg                           │
│    ├── 📁 Digital_Menu/                                                     │
│    │    └── Table-02_[DigitalMenu]_stock-02.png                             │
│    ├── 📁 WhatsApp_Placard/                                                 │
│    ├── 📁 Social_Media_Cards/                                               │
│    └── print_proofing_sheet.html (Standalone visual proofing preview)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Theme**: SaaS utilitarian dark interface (`bg-neutral-950` canvas, `bg-neutral-900` card surfaces, `border-neutral-800` subtle elevation dividers).
- **Mockup Badge Colors**: Distinctive, low-saturation category accents for quick visual identification:
  - Google Reviews: Amber/Gold accent (`text-amber-400 bg-amber-950/40 border-amber-800/50`)
  - Digital Menu: Emerald/Green accent (`text-emerald-400 bg-emerald-950/40 border-emerald-800/50`)
  - WhatsApp: Teal/Green accent (`text-teal-400 bg-teal-950/40 border-teal-800/50`)
  - Instagram & Facebook: Violet/Sky accent (`text-indigo-400 bg-indigo-950/40 border-indigo-800/50`)
  - Smart Hub: Purple accent (`text-purple-400 bg-purple-950/40 border-purple-800/50`)
- **Typography**: Plus Jakarta Sans for UI controls, JetBrains Mono / tabular numbers (`font-mono`) for slugs, filenames, coordinates, and batch counters.

---

## 3. Key Product Decisions & Trade-Offs

- **Hierarchical Mockup ZIP Structure**:
  - *Chosen Approach*: Group exported QR assets into subfolders matching mockup types (`/Google_Reviews/`, `/Digital_Menu/`, etc.) with transparent backgrounds and clear descriptive filenames (e.g. `Stand-01_GoogleReview_slug.png`).
  - *Why*: Solves the user's primary bottleneck: placing different QRs into different graphic templates in Photoshop/Illustrator without mixing up destinations or table numbers.
- **Client-Side ZIP Generation (`jszip`)**:
  - *Chosen Approach*: Generate the ZIP and high-res canvas exports directly in the browser using `jszip` and pure SVG/Canvas rasterizers.
  - *Why*: Instant download with zero server latency, works completely offline, and handles batches of hundreds of QR codes without memory spikes on the backend.
- **Hybrid Google Maps Search**:
  - *Chosen Approach*: Provide a server proxy endpoint (`/api/places/search`) utilizing Google Places API / Maps integration to return structured place metadata (Place ID, official name, address, rating, and direct review URL `https://search.google.com/local/writereview?placeid={place_id}`).
  - *Why*: Prevents CORS issues on client-side requests, keeps API keys secure, and guarantees users get genuine verified Place IDs.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TAPLOCAL EXPORT & SEARCH ENGINE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [ Client Browser ]                                                        │
│   ├── LinksTable & BatchFolders (Mockup Type Selector & Batch Tagging)      │
│   ├── EditDestinationModal & CreateLinkModal (Google Maps Place Search)     │
│   └── BulkPrintShopModal (Export Configurator)                              │
│       ├── JSZip Archiver (Builds multi-folder ZIP archive)                  │
│       ├── Canvas/SVG Renderer (Generates transparent 1000px PNGs & SVGs)    │
│       └── CSV Exporter (Builds laser-cut & print shop manifest)             │
│                                      │                                      │
│                                      ▼                                      │
│   [ Express Server (server.ts) ]                                            │
│   ├── GET /api/places/search?query=... (Google Maps Place Auto-Search)      │
│   └── POST /api/ai/generate-review (Multilingual Gemini 3.8 Flash Reviews)  │
│                                      │                                      │
│                                      ▼                                      │
│   [ Persistence Layer (localDb.ts & firestoreDb.ts) ]                       │
│   └── LinkRecord.targetMockup: 'google_review' | 'menu' | 'whatsapp' |      │
│                               'facebook' | 'instagram' | 'smart_hub'        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model Enhancements

```ts
export type MockupCategory = 
  | 'google_review'      // Physical acrylic review standee / sticker
  | 'digital_menu'       // Table tent / laminated food & drink card
  | 'whatsapp_order'     // Help desk / order inquiry card
  | 'instagram_follow'   // Social media sticker
  | 'facebook_community' // Social media stand
  | 'smart_hub'          // All-in-one multi-action plate
  | 'custom';            // General purpose

export interface LinkRecord {
  // Existing fields
  slug: string;
  destinationUrl: string;
  title: string;
  batchId?: string;
  tags?: string[];
  
  // New print & mockup fields
  targetMockup?: MockupCategory;
  standNumber?: string; // e.g. "Table 01", "Counter A", "Stand #4"
  placeId?: string;
  placeAddress?: string;
  placeRating?: number;
}
```

### Execution Phases Upon Approval
1. **Package Installation**: Install `jszip` and `@types/jszip` via `install_applet_package`.
2. **Server Search Endpoint**: Add `/api/places/search` in `server.ts` to power the live Google Maps Place auto-search.
3. **Data Model & Mockup Assignment UI**:
   - Add `targetMockup` and `standNumber` support to `types.ts`, `localDb.ts`, and `firestoreDb.ts`.
   - Add Mockup Selector chip control into `LinksTable.tsx`, `CreateLinkModal.tsx`, and `EditDestinationModal.tsx`.
4. **Google Maps Place Search Component**:
   - Embed search input with instant autocomplete results in `EditDestinationModal.tsx` and `CreateLinkModal.tsx`.
   - Auto-fill business title, Google Place ID, and official review URL upon place selection.
5. **Bulk Print Shop Export Modal**:
   - Create `BulkPrintShopModal.tsx` with batch selection, mockup folder previews, format toggles (PNG, SVG, CSV, Proof Sheet), and 1-click ZIP generation.
   - Generate production-ready CSV manifest for print shops and laser engravers.
6. **Verification**: Run `compile_applet` and test end-to-end export and search flows.
