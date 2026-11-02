# Batch QR Codes PNG & ZIP Export (Link Code Only, No Short Link)

Export batch dynamic QR codes into a ZIP file containing high-resolution 300 DPI PNG cards. Each image renders the clean QR code with **only the batch link code** (e.g. `CODE: #A1B2`) printed underneath—**without any short link or URL printed** on the image.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences are incorporated into this plan:
> - **No Short Link Printed**: Each generated PNG image strictly contains the sharp QR code and the bold link code text (e.g., `#A1B2` or `CODE: #A1B2`). No URL or short link (`/r/...` or domain) will be printed on the card canvas.
> - **PNG File Naming**: Files inside the ZIP archive are formatted as `[LINK-CODE]_[TITLE].png` (e.g., `A1B2_Table_01_Menu.png`), with fallback to `[LINK-CODE]_QR.png` if unassigned.
> - **UI Action Placements**: The "Download Batch PNGs (ZIP)" action is placed directly in the **Batch Print** header/toolbar AND on every batch group card in the **Links & QR Roster** table.

---

## 1. Overview & Core Concept

- **What It Does**: Allows administrators and clients to download an entire batch of dynamic QR codes in one click as a ZIP file. Each QR code is packaged as an individual high-resolution PNG image with only its unique link code printed directly below the code, suitable for acrylic standee makers, laser engravers, or print shops where URLs should not be visible.
- **Target Audience**: Business owners, marketing teams, and print vendors who need clean QR images identified solely by their link code.
- **Key Value**: Clean, uncluttered physical presentation; users only see the QR pattern and its reference code.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Batch Print Tab Download**:
   - The user opens the "Batch Print & Inventory" tab.
   - Beside the existing "Print A4 Sheet" and "Grid Density" controls, a primary button labeled **"Download Batch PNGs (ZIP)"** with a folder/archive icon is available.
   - When clicked, a progress indicator displays real-time generation progress (e.g., `"Rendering QR 4 of 24 (16%)..."`).
   - Once completed, the browser automatically triggers the download of `[BatchName]_QRCodes.zip`.

2. **Links Table Batch Group Download**:
   - In the "Dynamic Links & QR Roster" table, each batch folder/group header shows a dedicated button: **"Download ZIP (PNGs)"**.
   - Clicking downloads all links belonging to that specific batch in seconds.

3. **High-Resolution PNG Canvas Spec (No URLs)**:
   - Dimensions: 1024 × 1140 px (300 DPI crisp output).
   - Top / Center: Clean QR code with adequate quiet margin (32px padding).
   - Bottom Center Label:
     - Prominent bold link code (e.g., `CODE: #D8K2`) in dark monospace tabular font (`font-bold text-2xl`).
     - **No short link or URL printed on the image canvas**.

---

## 3. Technical Architecture & Implementation Details

```
┌────────────────────────────────────────────────────────┐
│ UI Layer: BatchPrintPage.tsx & LinksTable.tsx          │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ Batch Print Tab Button │  │ Group Row ZIP Button   │ │
│ └───────────┬────────────┘  └───────────┬────────────┘ │
└─────────────┼───────────────────────────┼──────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│ batchZipHelper.ts (Client-side fast generation)        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1. Loop through links array in batch               │ │
│ │ 2. Canvas: render QR code at high resolution       │ │
│ │ 3. Draw clean footer with ONLY bold Link Code      │ │
│ │    (Explicitly omitting any short URLs or links)   │ │
│ │ 4. Export canvas to PNG Blob                       │ │
│ │ 5. Add to JSZip instance: [CODE]_[TITLE].png       │ │
│ │ 6. jszip.generateAsync({ type: 'blob' })           │ │
│ │ 7. Trigger browser file download                   │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### File Changes

1. **`src/utils/batchZipHelper.ts` (New)**:
   - Implements `exportBatchQRsAsZip(batchName: string, links: LinkRecord[], onProgress?: (percent: number, current: number, total: number) => void): Promise<void>`.
   - Uses `qrcode` and HTML5 canvas to render crisp PNG cards with ONLY the bold link code printed underneath (no URLs).
   - Packages all PNGs into a ZIP using `jszip` (already in `package.json`).
   - Downloads the ZIP file directly to the client's device without server load.

2. **`src/components/BatchPrintPage.tsx`**:
   - Add "Download ZIP (PNGs)" button to the batch generation / inventory action bars.
   - Wire generation progress state so users see instant visual feedback.

3. **`src/components/LinksTable.tsx`**:
   - In batch group headers, add a compact "Download ZIP" action alongside the existing print sheet action.

4. **`src/components/ClientRedirectHandler.tsx` Fix**:
   - Remove the orphaned condition leftover around line 647 that caused the earlier compilation error so the build remains 100% clean.

---

## 4. Verification Plan

1. Verify build compilation using `compile_applet`.
2. Test generating a batch in Batch Print tab and clicking "Download Batch PNGs (ZIP)".
3. Verify that the downloaded ZIP contains individual PNG files named `[CODE]_[Title].png` with sharp QR codes and ONLY the link code printed below (no URL).
4. Test clicking "Download ZIP" on batch groups in the Links Table.
